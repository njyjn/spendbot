import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@nextui-org/react";

const ThemeSwitcher = (props: { variant: "bordered" | "flat" | "faded" }) => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, systemTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  function toggle() {
    const currentTheme = theme || systemTheme || "light";
    setTheme(currentTheme === "dark" ? "light" : "dark");
  }

  function symbol() {
    const selectedTheme = theme || systemTheme || "light";
    return selectedTheme === "dark" ? "🌞" : "🌚";
  }

  return (
    <Button
      variant={props.variant}
      size="sm"
      onClick={() => {
        toggle();
      }}
    >
      {symbol()}
    </Button>
  );
};

export default ThemeSwitcher;
