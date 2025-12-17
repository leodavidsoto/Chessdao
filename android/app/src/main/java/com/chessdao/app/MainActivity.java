package com.chessdao.app;

import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();

        // Handle deeplink callback from Phantom
        Intent intent = getIntent();
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            String scheme = data.getScheme();

            // If this is a chessdao:// callback, pass parameters to WebView
            if ("chessdao".equals(scheme)) {
                String url = "file:///android_asset/public/index.html" + "?" + data.getQuery();
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    webView.loadUrl(url);
                }
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        // Handle deeplink callback
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            String scheme = data.getScheme();

            if ("chessdao".equals(scheme)) {
                // Reload with query params from Phantom
                String query = data.getQuery();
                if (query != null && !query.isEmpty()) {
                    WebView webView = getBridge().getWebView();
                    if (webView != null) {
                        String currentUrl = webView.getUrl();
                        if (currentUrl != null) {
                            String baseUrl = currentUrl.split("\\?")[0];
                            webView.loadUrl(baseUrl + "?" + query);
                        }
                    }
                }
            }
        }
    }
}
