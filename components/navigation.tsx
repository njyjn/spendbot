import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useUser } from "@auth0/nextjs-auth0/client";
import {
  Avatar,
  Button,
  ButtonGroup,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
} from "@nextui-org/react";
import { useState } from "react";
import ThemeSwitcher from "./themeSwitcher";

export default function Navigation() {
  const { user, error, isLoading } = useUser();
  const { locale, locales, route } = useRouter();

  const otherLocale = locales?.find((cur) => cur !== locale);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const t = useTranslations("Navigation");

  return (
    <Navbar onMenuOpenChange={setIsMenuOpen} position="sticky" isBordered>
      <NavbarContent className="sm:hidden" justify="start">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
        />
      </NavbarContent>
      <NavbarContent className="sm:hidden pr-3" justify="center">
        <NavbarBrand>
          <Link href="/" locale={locale}>
            💸 SpendBot
          </Link>
        </NavbarBrand>
      </NavbarContent>
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <NavbarBrand>
          <Link href="/" locale={locale}>
            💸 SpendBot
          </Link>
        </NavbarBrand>
      </NavbarContent>
      {user ? (
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem isActive={route === "/overview"}>
            <Link href="/overview" locale={locale} color="foreground">
              {t("networth")}
            </Link>
          </NavbarItem>
          <NavbarItem isActive={route === "/summary"}>
            <Link href="/summary" locale={locale} color="foreground">
              {t("summary")}
            </Link>
          </NavbarItem>
          <NavbarItem isActive={route === "/add"}>
            <Link href="/add" locale={locale} color="foreground">
              {t("add")}
            </Link>
          </NavbarItem>
          <NavbarItem isActive={route === "/god"}>
            <Link href="/god" locale={locale} color="foreground">
              {t("god")}
            </Link>
          </NavbarItem>
        </NavbarContent>
      ) : (
        <></>
      )}
      <NavbarContent justify="end">
        <NavbarItem className="hidden sm:flex gap-4">
          <ButtonGroup>
            <Button
              size="sm"
              variant="flat"
              as={Link}
              href={route}
              locale={otherLocale}
            >
              {t("locale", { locale: otherLocale })}
            </Button>
            <ThemeSwitcher variant="flat" />
          </ButtonGroup>
        </NavbarItem>
        {user ? (
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                isBordered
                as="button"
                className="transition-transform"
                color="secondary"
                name={user.name || undefined}
                size="sm"
                src={user.picture || undefined}
              ></Avatar>
            </DropdownTrigger>
            <DropdownMenu aria-label="profile-actions" variant="flat">
              <DropdownItem key="profile" className="h-14 gap-2">
                <p className="font-semibold">
                  {t("hello")}, {user.name}
                </p>
              </DropdownItem>
                            <DropdownItem
                key="logout"
                color="danger"
                as={Link}
                href="/api/auth/logout"
               >
                 {t("logout")}
               </DropdownItem>

            </DropdownMenu>
          </Dropdown>
        ) : (
          <NavbarItem>
            <Button
              as={Link}
              href="/api/auth/login"
              locale={locale}
              radius="full"
              color="secondary"
            >
              {t("login")}
            </Button>
          </NavbarItem>
        )}
      </NavbarContent>
      <NavbarMenu>
        <NavbarMenuItem key="locale">
          <ButtonGroup className="my-3" fullWidth radius="full">
            <Button
              variant="flat"
              size="sm"
              as={Link}
              href={route}
              locale={otherLocale}
            >
              {t("locale", { locale: otherLocale })}
            </Button>
            <ThemeSwitcher variant="flat" />
          </ButtonGroup>
        </NavbarMenuItem>
        {user ? (
          <>
            <NavbarMenuItem key="overview" isActive={route === "/overview"}>
              <Link
                className="w-full"
                href="/overview"
                locale={locale}
                color="foreground"
              >
                💰 {t("networth")}
              </Link>
            </NavbarMenuItem>
            <NavbarMenuItem key="summary" isActive={route === "/summary"}>
              <Link
                className="w-full"
                href="/summary"
                locale={locale}
                color="foreground"
              >
                📊 {t("summary")}
              </Link>
            </NavbarMenuItem>
            <NavbarMenuItem key="add" isActive={route === "/add"}>
              <Link
                className="w-full"
                href="/add"
                locale={locale}
                color="foreground"
              >
                🧮 {t("add")}
              </Link>
            </NavbarMenuItem>
            <NavbarMenuItem key="god" isActive={route === "/god"}>
              <Link
                className="w-full"
                href="/god"
                locale={locale}
                color="foreground"
              >
                🌈 {t("god")}
              </Link>
            </NavbarMenuItem>
          </>
        ) : (
          <></>
        )}
      </NavbarMenu>
    </Navbar>
  );
}

Navigation.messages = ["Navigation"];
