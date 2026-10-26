package com.smithsofeldravar.game;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.StatFs;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.net.ssl.HttpsURLConnection;

@CapacitorPlugin(name = "AndroidUpdater")
public class AndroidUpdaterPlugin extends Plugin {
    private static final String UPDATE_DIR = "android-updates";
    private static final String UPDATE_FILE = "smiths-of-eldravar-update.apk";
    private static final long STORAGE_RESERVE_BYTES = 32L * 1024L * 1024L;
    private static final int BUFFER_SIZE = 64 * 1024;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile UpdateRequest pendingSaveRequest;

    @PluginMethod
    public void getCurrentInfo(PluginCall call) {
        try {
            PackageInfo info = getInstalledPackageInfo(0);
            JSObject result = new JSObject();
            result.put("packageName", info.packageName);
            result.put("versionName", info.versionName == null ? "" : info.versionName);
            result.put("versionCode", versionCode(info));
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Installierte Android-Version konnte nicht gelesen werden: " + error.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndVerify(PluginCall call) {
        UpdateRequest request;
        try {
            request = requestFrom(call, true);
        } catch (Exception error) {
            call.reject(error.getMessage());
            return;
        }

        executor.execute(() -> {
            try {
                File apk = download(request);
                verifyDownloadedApk(apk, request);
                JSObject result = new JSObject();
                result.put("status", "ready");
                result.put("bytesDownloaded", apk.length());
                call.resolve(result);
            } catch (Exception error) {
                clearUpdateFiles();
                call.reject(error.getMessage());
            }
        });
    }

    @PluginMethod
    public void saveVerifiedUpdate(PluginCall call) {
        UpdateRequest request;
        try {
            request = requestFrom(call, false);
            File apk = updateFile();
            if (!apk.isFile()) throw new IllegalStateException("Es liegt keine geprüfte Update-APK bereit.");
            verifyDownloadedApk(apk, request);
            pendingSaveRequest = request;

            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/vnd.android.package-archive");
            intent.putExtra(Intent.EXTRA_TITLE, releaseFileName(request.versionName));
            startActivityForResult(call, intent, "saveVerifiedUpdateResult");
        } catch (Exception error) {
            pendingSaveRequest = null;
            call.reject("Geprüfte APK konnte nicht zum Speichern vorbereitet werden: " + error.getMessage());
        }
    }

    @ActivityCallback
    private void saveVerifiedUpdateResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            pendingSaveRequest = null;
            return;
        }
        if (result.getResultCode() != Activity.RESULT_OK
            || result.getData() == null
            || result.getData().getData() == null) {
            pendingSaveRequest = null;
            JSObject response = new JSObject();
            response.put("status", "cancelled");
            call.resolve(response);
            return;
        }

        Uri destination = result.getData().getData();
        UpdateRequest request = pendingSaveRequest;
        pendingSaveRequest = null;
        if (request == null) {
            call.reject("Update-Speicherauftrag ist nicht mehr verfügbar.");
            return;
        }

        executor.execute(() -> {
            try {
                File apk = updateFile();
                verifyDownloadedApk(apk, request);
                OutputStream raw = getContext().getContentResolver().openOutputStream(destination, "w");
                if (raw == null) throw new IllegalStateException("Zieldatei konnte nicht geöffnet werden.");
                try (
                    InputStream input = new BufferedInputStream(new FileInputStream(apk), BUFFER_SIZE);
                    OutputStream output = new BufferedOutputStream(raw, BUFFER_SIZE)
                ) {
                    byte[] buffer = new byte[BUFFER_SIZE];
                    int read;
                    while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
                }

                JSObject response = new JSObject();
                response.put("status", "saved");
                response.put("fileName", releaseFileName(request.versionName));
                clearUpdateFiles();
                call.resolve(response);
            } catch (Exception error) {
                call.reject("Geprüfte APK konnte nicht gespeichert werden: " + error.getMessage());
            }
        });
    }

    @PluginMethod
    public void clearDownloadedUpdate(PluginCall call) {
        clearUpdateFiles();
        call.resolve();
    }

    private UpdateRequest requestFrom(PluginCall call, boolean requireUrl) {
        String apkUrl = call.getString("apkUrl", "");
        String sha256 = call.getString("sha256", "");
        String versionName = call.getString("versionName", "");
        Integer versionCode = call.getInt("versionCode");
        long apkSize = call.getData().optLong("apkSize", -1L);

        if (requireUrl && (apkUrl == null || apkUrl.trim().isEmpty())) throw new IllegalArgumentException("apkUrl fehlt.");
        if (sha256 == null || !sha256.matches("(?i)^[0-9a-f]{64}$")) throw new IllegalArgumentException("sha256 ist ungültig.");
        if (versionName == null || versionName.trim().isEmpty()) throw new IllegalArgumentException("versionName fehlt.");
        if (versionCode == null || versionCode <= 0) throw new IllegalArgumentException("versionCode ist ungültig.");
        if (apkSize <= 0) throw new IllegalArgumentException("apkSize ist ungültig.");

        return new UpdateRequest(apkUrl == null ? "" : apkUrl.trim(), apkSize, sha256.toLowerCase(Locale.ROOT), versionName.trim(), versionCode.longValue());
    }

    private File download(UpdateRequest request) throws Exception {
        URL url = new URL(request.apkUrl);
        if (!"https".equalsIgnoreCase(url.getProtocol())) throw new SecurityException("Update-Downloads sind ausschließlich über HTTPS erlaubt.");
        ensureStorage(request.apkSize);

        File directory = updateDirectory();
        if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Temporäres Update-Verzeichnis konnte nicht angelegt werden.");
        File partial = new File(directory, UPDATE_FILE + ".part");
        File target = updateFile();
        if (partial.exists() && !partial.delete()) throw new IllegalStateException("Alter Teil-Download konnte nicht entfernt werden.");
        if (target.exists() && !target.delete()) throw new IllegalStateException("Alte Update-Datei konnte nicht entfernt werden.");

        HttpsURLConnection connection = (HttpsURLConnection) url.openConnection();
        connection.setConnectTimeout(15_000);
        connection.setReadTimeout(30_000);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Accept", "application/vnd.android.package-archive, application/octet-stream");
        connection.connect();

        int responseCode = connection.getResponseCode();
        if (responseCode < 200 || responseCode >= 300) {
            connection.disconnect();
            throw new IllegalStateException("APK-Download fehlgeschlagen (HTTP " + responseCode + ").");
        }
        if (!"https".equalsIgnoreCase(connection.getURL().getProtocol())) {
            connection.disconnect();
            throw new SecurityException("Der APK-Download wurde auf eine unsichere URL umgeleitet.");
        }

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        long total = 0L;
        long lastProgressAt = 0L;
        try (
            InputStream input = new BufferedInputStream(connection.getInputStream(), BUFFER_SIZE);
            OutputStream output = new BufferedOutputStream(new FileOutputStream(partial), BUFFER_SIZE)
        ) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int read;
            while ((read = input.read(buffer)) != -1) {
                total += read;
                if (total > request.apkSize) throw new SecurityException("APK ist größer als im Manifest angegeben.");
                output.write(buffer, 0, read);
                digest.update(buffer, 0, read);

                long now = System.currentTimeMillis();
                if (now - lastProgressAt >= 150L || total == request.apkSize) {
                    notifyProgress(total, request.apkSize);
                    lastProgressAt = now;
                }
            }
        } finally {
            connection.disconnect();
        }

        if (total != request.apkSize) throw new SecurityException("APK-Größe stimmt nicht mit dem Manifest überein.");
        String actualHash = hex(digest.digest());
        if (!actualHash.equalsIgnoreCase(request.sha256)) throw new SecurityException("SHA-256-Prüfsumme der APK stimmt nicht.");
        if (!partial.renameTo(target)) throw new IllegalStateException("Geprüfte APK konnte nicht in den Update-Cache übernommen werden.");
        notifyProgress(total, request.apkSize);
        return target;
    }

    private void verifyDownloadedApk(File apk, UpdateRequest request) throws Exception {
        if (!apk.isFile()) throw new IllegalStateException("Update-APK fehlt.");
        if (apk.length() != request.apkSize) throw new SecurityException("APK-Größe stimmt nicht mit dem Manifest überein.");
        if (!sha256(apk).equalsIgnoreCase(request.sha256)) throw new SecurityException("SHA-256-Prüfsumme der APK stimmt nicht.");

        PackageManager manager = getContext().getPackageManager();
        int signingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? PackageManager.GET_SIGNING_CERTIFICATES
            : PackageManager.GET_SIGNATURES;
        PackageInfo candidate = manager.getPackageArchiveInfo(apk.getAbsolutePath(), signingFlags);
        if (candidate == null) throw new SecurityException("Die heruntergeladene Datei ist keine lesbare Android-APK.");
        if (!getContext().getPackageName().equals(candidate.packageName)) throw new SecurityException("APK-Paketname stimmt nicht mit der installierten App überein.");

        long candidateCode = versionCode(candidate);
        long currentCode = versionCode(getInstalledPackageInfo(signingFlags));
        if (candidateCode != request.versionCode) throw new SecurityException("APK-versionCode stimmt nicht mit dem Update-Manifest überein.");
        if (candidateCode <= currentCode) throw new SecurityException("APK-versionCode ist nicht höher als die installierte Version.");
        String candidateName = candidate.versionName == null ? "" : candidate.versionName;
        if (!request.versionName.equals(candidateName)) throw new SecurityException("APK-versionName stimmt nicht mit dem Update-Manifest überein.");

        PackageInfo installed = getInstalledPackageInfo(signingFlags);
        if (!signerFingerprints(installed).equals(signerFingerprints(candidate))) {
            throw new SecurityException("APK-Signatur stimmt nicht mit der installierten App überein.");
        }
    }

    private PackageInfo getInstalledPackageInfo(int flags) throws PackageManager.NameNotFoundException {
        return getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), flags);
    }

    private long versionCode(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return info.getLongVersionCode();
        return info.versionCode;
    }

    private Set<String> signerFingerprints(PackageInfo info) throws Exception {
        Signature[] signatures;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            if (info.signingInfo == null) throw new SecurityException("APK besitzt keine lesbaren Signaturinformationen.");
            signatures = info.signingInfo.getApkContentsSigners();
        } else {
            signatures = info.signatures;
        }
        if (signatures == null || signatures.length == 0) throw new SecurityException("APK besitzt keine Signatur.");

        Set<String> result = new HashSet<>();
        for (Signature signature : signatures) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            result.add(hex(digest.digest(signature.toByteArray())));
        }
        return result;
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new BufferedInputStream(new FileInputStream(file), BUFFER_SIZE)) {
            byte[] buffer = new byte[BUFFER_SIZE];
            int read;
            while ((read = input.read(buffer)) != -1) digest.update(buffer, 0, read);
        }
        return hex(digest.digest());
    }

    private String hex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) result.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        return result.toString();
    }

    private void ensureStorage(long apkSize) {
        StatFs stats = new StatFs(getContext().getCacheDir().getAbsolutePath());
        long required = apkSize > (Long.MAX_VALUE - STORAGE_RESERVE_BYTES) / 2L
            ? Long.MAX_VALUE
            : apkSize * 2L + STORAGE_RESERVE_BYTES;
        if (stats.getAvailableBytes() < required) throw new IllegalStateException("Zu wenig freier Speicher für Download und Export der Update-APK.");
    }

    private void notifyProgress(long downloaded, long total) {
        JSObject event = new JSObject();
        event.put("bytesDownloaded", downloaded);
        event.put("totalBytes", total);
        event.put("percent", total <= 0 ? 0 : Math.min(100, Math.round(downloaded * 100.0 / total)));
        notifyListeners("downloadProgress", event);
    }

    private File updateDirectory() {
        return new File(getContext().getCacheDir(), UPDATE_DIR);
    }

    private File updateFile() {
        return new File(updateDirectory(), UPDATE_FILE);
    }

    private void clearUpdateFiles() {
        File directory = updateDirectory();
        File target = updateFile();
        File partial = new File(directory, UPDATE_FILE + ".part");
        if (target.exists()) target.delete();
        if (partial.exists()) partial.delete();
        if (directory.isDirectory()) directory.delete();
    }

    private String releaseFileName(String versionName) {
        String safe = versionName.replaceAll("[^0-9A-Za-z._-]", "_");
        return "Smiths-of-Eldravar-v" + safe + ".apk";
    }

    private static final class UpdateRequest {
        final String apkUrl;
        final long apkSize;
        final String sha256;
        final String versionName;
        final long versionCode;

        UpdateRequest(String apkUrl, long apkSize, String sha256, String versionName, long versionCode) {
            this.apkUrl = apkUrl;
            this.apkSize = apkSize;
            this.sha256 = sha256;
            this.versionName = versionName;
            this.versionCode = versionCode;
        }
    }
}
