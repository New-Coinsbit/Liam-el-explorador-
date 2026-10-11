package com.newcoinsbit.liamelexplorador;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.io.File;
import java.util.Arrays;

public class MainActivity extends BridgeActivity {
    private ValueCallback<Uri[]> photoCallback;
    private Uri photoUri;
    private File photoFile;
    private ActivityResultLauncher<Intent> cameraLauncher;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        cameraLauncher = bridge.registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            ValueCallback<Uri[]> callback = photoCallback;
            photoCallback = null;
            if (callback != null) {
                boolean captured = result.getResultCode() == Activity.RESULT_OK && photoFile != null && photoFile.length() > 0;
                callback.onReceiveValue(captured ? new Uri[] { photoUri } : null);
                if (!captured) clearPhoto();
            }
        });
        bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(bridge) {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!params.isCaptureEnabled() || !Arrays.asList(params.getAcceptTypes()).contains("image/*")) {
                    return super.onShowFileChooser(view, callback, params);
                }
                if (photoCallback != null) photoCallback.onReceiveValue(null);
                clearPhoto();
                photoCallback = callback;
                try {
                    photoFile = File.createTempFile("liam-school-", ".jpg", getCacheDir());
                    photoUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", photoFile);
                    Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    intent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
                    intent.setClipData(ClipData.newRawUri("Foto de la actividad", photoUri));
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    cameraLauncher.launch(intent);
                } catch (Exception error) {
                    photoCallback = null;
                    callback.onReceiveValue(null);
                    clearPhoto();
                    Toast.makeText(MainActivity.this, "No se pudo abrir la cámara. Comprueba que esté disponible e inténtalo de nuevo.", Toast.LENGTH_LONG).show();
                }
                // A camera failure or cancellation must never open the gallery.
                return true;
            }
        });
    }

    private void clearPhoto() {
        if (photoFile != null) photoFile.delete();
        photoFile = null;
        photoUri = null;
    }

    @Override
    public void onDestroy() {
        if (photoCallback != null) photoCallback.onReceiveValue(null);
        photoCallback = null;
        clearPhoto();
        super.onDestroy();
    }
}
