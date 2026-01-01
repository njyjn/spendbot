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
      <meta property="og:url" content="https://spend.bot.ngsim.net" />
      <meta property="og:title" content="SpendBot" />
      <meta
        property="og:description"
        content="Empower your finances easily with SpendBot"
      />
      <meta property="og:image" content="/images/meta.jpg" />
      {/* <!-- Twitter --> */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content="https://spend.bot.ngsim.net" />
      <meta property="twitter:title" content="SpendBot" />
      <meta
        property="twitter:description"
        content="Empower your finances easily with SpendBot"
      />
      <meta property="twitter:image" content="/images/meta.jpg" />
      {/* <!-- Meta Tags Generated with https://metatags.io --> */}

      <meta
        key="viewport"
        content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
        name="viewport"
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <link rel="manifest" href="/site.webmanifest" />
    </NextHead>
  );
};
