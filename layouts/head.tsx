import React from "react";
import NextHead from "next/head";

export const Head = () => {
  return (
    <NextHead>
      <title>SpendBot</title>
      <meta key="title" content="SpendBot" property="og:title" />
      <meta content="Manage your spending" property="og:description" />
      <meta content="Manage your spending" name="description" />
      <meta
        key="viewport"
        content="viewport-fit=cover, width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
        name="viewport"
      />
      <link href="/images/favicon.ico" rel="icon" />
    </NextHead>
  );
};
