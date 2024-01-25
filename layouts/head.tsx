import React from "react";
import NextHead from "next/head";

export const Head = () => {
  return (
    <NextHead>
      {/* <!-- Primary Meta Tags --> */}
      <title>SpendBot</title>
      <meta name="title" content="SpendBot" />
      <meta
        name="description"
        content="Empower your finances easily with SpendBot"
      />
      {/* <!-- Open Graph / Facebook --> */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://bot.ngsim.net/spend" />
      <meta property="og:title" content="SpendBot" />
      <meta
        property="og:description"
        content="Empower your finances easily with SpendBot"
      />
      <meta property="og:image" content="/spend/images/meta.jpg" />
      {/* <!-- Twitter --> */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content="https://bot.ngsim.net/spend" />
      <meta property="twitter:title" content="SpendBot" />
      <meta
        property="twitter:description"
        content="Empower your finances easily with SpendBot"
      />
      <meta property="twitter:image" content="/spend/images/meta.jpg" />
      {/* <!-- Meta Tags Generated with https://metatags.io --> */}

      <meta
        key="viewport"
        content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
        name="viewport"
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/spend/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/spend/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/spend/favicon-16x16.png"
      />
      <link rel="manifest" href="/spend/site.webmanifest" />
    </NextHead>
  );
};
