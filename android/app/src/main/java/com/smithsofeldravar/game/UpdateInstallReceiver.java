package com.smithsofeldravar.game;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInstaller;
import android.os.Build;

public class UpdateInstallReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!AndroidUpdaterPlugin.INSTALL_ACTION.equals(intent.getAction())) return;

        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        String message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        SharedPreferences preferences = context.getSharedPreferences(AndroidUpdaterPlugin.PREFS_NAME, Context.MODE_PRIVATE);

        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirmation;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                confirmation = intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
            } else {
                @SuppressWarnings("deprecation")
                Intent legacyConfirmation = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                confirmation = legacyConfirmation;
            }
            preferences.edit().putString(AndroidUpdaterPlugin.PREF_STATUS, "awaiting-user").putString(AndroidUpdaterPlugin.PREF_MESSAGE, "").apply();
            if (confirmation != null) {
                confirmation.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(confirmation);
            }
            return;
        }

        String normalizedStatus = status == PackageInstaller.STATUS_SUCCESS ? "success" : "failure";
        preferences.edit()
            .putString(AndroidUpdaterPlugin.PREF_STATUS, normalizedStatus)
            .putString(AndroidUpdaterPlugin.PREF_MESSAGE, message == null ? "" : message)
            .apply();
        AndroidUpdaterPlugin.clearUpdateFiles(context);
    }
}
