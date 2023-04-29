import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html className="dark" lang="en">
      <Head>
        <Script src="https://telegram.org/js/telegram-web-app.js"></Script>
      </Head>
      <body className="dark:text-white dark:bg-slate-900">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
