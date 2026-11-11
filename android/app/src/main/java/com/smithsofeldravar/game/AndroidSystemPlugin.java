package com.smithsofeldravar.game;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AndroidSystem")
public class AndroidSystemPlugin extends Plugin {
    private static final int MAX_SAVE_BYTES = 5_000_000;
    private final ExecutorService fileExecutor = Executors.newSingleThreadExecutor();

    @Override
    public void load() {
        // S04: Die Android-Systemtaste und die System-Zurueckgeste nutzen denselben
        // Angular-Navigationspfad. Kein Rueckfall auf WebView-History oder App-Beenden.
        getActivity().getOnBackPressedDispatcher().addCallback(getActivity(), new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() == null || getBridge().getWebView() == null) return;
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new Event('soe:android-back'));", null
                );
            }
        });
    }

    @PluginMethod
    public void exportSave(PluginCall call) {
        String fileName = call.getString("fileName", "");
        String json = call.getString("json", "");
        if (fileName == null || fileName.isEmpty() || fileName.length() > 180
            || fileName.contains("/") || fileName.contains("\\")
            || !fileName.toLowerCase(java.util.Locale.ROOT).endsWith(".json")) {
            call.reject("Ungueltiger JSON-Dateiname.");
            return;
        }
        if (json == null || json.isEmpty() || json.getBytes(StandardCharsets.UTF_8).length > MAX_SAVE_BYTES) {
            call.reject("Spielstanddaten sind leer oder zu gross.");
            return;
        }

        try {
            // S04a: Nutzergesteuerter Android-Systemdialog, keine App-private Datei.
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, fileName);
            startActivityForResult(call, intent, "exportSaveResult");
        } catch (Exception error) {
            call.reject("Android-Dateiauswahl konnte nicht geoeffnet werden: " + error.getMessage());
        }
    }

    @ActivityCallback
    private void exportSaveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK
            || result.getData() == null || result.getData().getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("status", "cancelled");
            call.resolve(cancelled);
            return;
        }

        final Uri destination = result.getData().getData();
        final byte[] expected = call.getString("json", "").getBytes(StandardCharsets.UTF_8);
        final String requestedFileName = call.getString("fileName", "");

        fileExecutor.execute(() -> {
            try {
                // Schreiben und anschliessend tatsaechlich zuruecklesen. Nur dann Erfolg melden.
                OutputStream raw = getContext().getContentResolver().openOutputStream(destination, "wt");
                if (raw == null) throw new IOException("Android hat keinen Ausgabestream bereitgestellt.");
                try (OutputStream output = raw) {
                    output.write(expected);
                    output.flush();
                }

                MessageDigest expectedDigest = MessageDigest.getInstance("SHA-256");
                byte[] expectedHash = expectedDigest.digest(expected);
                MessageDigest readDigest = MessageDigest.getInstance("SHA-256");
                long bytesRead = 0L;
                try (InputStream input = getContext().getContentResolver().openInputStream(destination)) {
                    if (input == null) throw new IOException("Gespeicherte Datei konnte nicht nachgelesen werden.");
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        readDigest.update(buffer, 0, read);
                        bytesRead += read;
                    }
                }
                if (bytesRead != expected.length || !MessageDigest.isEqual(expectedHash, readDigest.digest())) {
                    throw new IOException("Gespeicherte JSON-Datei stimmt nicht mit dem Spielstand ueberein.");
                }

                JSObject saved = new JSObject();
                saved.put("status", "saved");
                saved.put("fileName", actualFileName(destination, requestedFileName));
                saved.put("bytesWritten", expected.length);
                call.resolve(saved);
            } catch (Exception error) {
                call.reject("JSON-Spielstand konnte nicht sicher gespeichert werden: " + error.getMessage());
            }
        });
    }

    private String actualFileName(Uri uri, String fallback) {
        try (Cursor cursor = getContext().getContentResolver().query(
            uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                int column = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (column >= 0) {
                    String name = cursor.getString(column);
                    if (name != null && !name.isEmpty()) return name;
                }
            }
        } catch (Exception ignored) {
            // Der Speichererfolg ist unabhaengig von der optionalen Dateinamenabfrage.
        }
        return fallback;
    }
}
