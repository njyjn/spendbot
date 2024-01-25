import React, { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import moment from "moment";
import { useTranslations } from "next-intl";
import { GetStaticPropsContext } from "next";
import useSWR from "swr";
import {
  Button,
  Modal,
  ModalContent,
  ModalBody,
  ModalFooter,
  Table,
  TableBody,
  TableHeader,
  TableColumn,
  TableRow,
  TableCell,
  Tooltip,
  Divider,
  ModalHeader,
  useDisclosure,
  Input,
  Spinner,
} from "@nextui-org/react";
import { EditIcon, DeleteIcon, PlusIcon, SaveIcon } from "../components/icons";
import TableCellEditable from "@/components/table/cellEditable";
import DefaultLayout from "@/layouts/default";
import { subtitle, title } from "@/components/primitives";
import homePic from "@/public/images/giphy.gif";

async function fetcher(uri: string) {
  const response = await fetch(uri);
  return response.json();
}

export async function getStaticProps({ locale }: GetStaticPropsContext) {
  return {
    props: {
      messages: (await import(`../messages/${locale}.json`)).default,
    },
  };
}

export default withPageAuthRequired(function God() {
  const router = useRouter();
  const t = useTranslations("God");

  const month = moment().add(1, "months").format("MMM YY");

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTableRowBeingEdited, setIsTableRowBeingEdited] = useState<
    number | undefined
  >();

  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userFederationId, setUserFederationId] = useState("");
  const [userTelegramId, setUserTelegramId] = useState("");

  const { data: users, isLoading: usersIsLoading } = useSWR(
    "/spend/api/god/users",
    fetcher,
  );

  const {
    isOpen: isUserOpen,
    onOpen: onUserOpen,
    onOpenChange: onUserOpenChange,
  } = useDisclosure();

  const patchUser = async (id: string | number) => {
    setIsLoading(true);
    const response = await fetch(`/spend/api/god/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: userFirstName,
        last_name: userLastName,
        federation_id: userFederationId,
        telegram_id: userTelegramId,
      }),
    });
    if ((await response.json()).ok) {
      setIsSuccess(true);
    } else {
      alert("Something went wrong");
    }
    setIsLoading(false);
  };

  const deleteUser = async (id: string | number) => {
    setIsLoading(true);
    const response = await fetch(`/spend/api/god/users/${id}`, {
      method: "DELETE",
    });
    if ((await response.json()).ok) {
      setIsSuccess(true);
    } else {
      alert("Something went wrong");
    }
    setIsLoading(false);
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <Modal
          placement="center"
          isOpen={isUserOpen}
          onOpenChange={onUserOpenChange}
        >
          <ModalContent>
            {(onUserClose) => (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setIsLoading(true);
                  const response = await fetch("/spend/api/god/users", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      first_name: userFirstName,
                      last_name: userLastName,
                      federation_id: userFederationId,
                      telegram_id: userTelegramId,
                    }),
                  });
                  if ((await response.json()).ok) {
                    onUserClose();
                    setIsSuccess(true);
                  } else alert("Something went wrong");
                  setIsLoading(false);
                }}
              >
                <ModalHeader className="flex flex-col gap-1">
                  {t("formUserHeader")}
                </ModalHeader>
                <ModalBody>
                  <Input
                    autoFocus
                    isRequired
                    label={t("formUserFirstName")}
                    onChange={(event) => {
                      setUserFirstName(event.target.value);
                    }}
                  />
                  <Input
                    label={t("formUserLastName")}
                    onChange={(event) => {
                      setUserLastName(event.target.value);
                    }}
                  />
                  <Input
                    label={t("formUserFederationId")}
                    onChange={(event) => {
                      setUserFederationId(event.target.value);
                    }}
                  />
                  <Input
                    label={t("formUserTelegramId")}
                    onChange={(event) => {
                      setUserTelegramId(event.target.value);
                    }}
                  />
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="flat" onPress={onUserClose}>
                    {t("formClose")}
                  </Button>
                  <Button color="primary" type="submit" isLoading={isLoading}>
                    {t("formUserSubmit")}
                  </Button>
                </ModalFooter>
              </form>
            )}
          </ModalContent>
        </Modal>
        <Modal placement="center" isOpen={isSuccess} hideCloseButton>
          <ModalContent>
            <ModalHeader>✅ {t("formSubmitSuccess")}</ModalHeader>
            <ModalFooter>
              <Button
                onClick={() => {
                  setIsSuccess(false);
                  router.reload();
                }}
                color="primary"
              >
                {t("formSubmitSuccessBack")}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        <div className="inline-block max-w-lg text-center justify-center">
          <h1 className={title()}>🌈 {t("title")}</h1>
        </div>
        <Image className="py-4 mx-auto" src={homePic} alt="money where"></Image>
        <div className="gap-1 grid grid-rows-2">
          <div className="row-span-12">
            <h4 className={subtitle()}>{t("controls")}</h4>
            <Button
              fullWidth
              color="danger"
              disabled={isLoading}
              onPress={async () => {
                setIsLoading(true);
                const response = await fetch(`/spend/api/clone?month=${month}`);
                if ((await response.json()).ok) {
                  setIsSuccess(true);
                }
                setIsLoading(false);
              }}
            >
              {isLoading
                ? t("formSubmitLoading")
                : `🆕 ${t("formSubmit", {
                    month: month,
                  })}`}
            </Button>
          </div>
          <div className="row-span-12"></div>
          <h4 className={subtitle()}>{t("users")}</h4>
          <div className="flex justify-between gap-3 items-end mb-3">
            <p>Total: {usersIsLoading ? t("tableLoading") : users.length}</p>
            <div className="flex gap-3">
              <Button
                color="primary"
                endContent={<PlusIcon />}
                onPress={onUserOpen}
              >
                {t("tableUsersAdd")}
              </Button>
            </div>
          </div>
          <div className="max-w-[900px] gap-2 grid grid-cols-12 grid-rows-1">
            <Table
              className="col-span-12 sm:col-span-12"
              aria-label="users-table"
            >
              <TableHeader>
                <TableColumn>{t("tableUsersHeaderColActions")}</TableColumn>
                <TableColumn>{t("tableUsersHeaderColId")}</TableColumn>
                <TableColumn>{t("tableUsersHeaderColFirstName")}</TableColumn>
                <TableColumn>{t("tableUsersHeaderColLastName")}</TableColumn>
                <TableColumn>
                  {t("tableUsersHeaderColFederationId")}
                </TableColumn>
                <TableColumn>{t("tableUsersHeaderColTelegramId")}</TableColumn>
              </TableHeader>
              <TableBody
                emptyContent={usersIsLoading ? <></> : t("tableNoUsers")}
                isLoading={usersIsLoading}
                loadingContent={<Spinner label={t("tableLoading")} />}
              >
                {users?.map((u: any, i: number) => {
                  return [
                    <TableRow key={i}>
                      <TableCell>
                        <div className="relative flex items-center gap-2">
                          <Tooltip
                            color="danger"
                            content={t("tableUsersActionTooltipDelete")}
                          >
                            <span className="text-lg text-danger cursor-pointer active:opacity-50">
                              <DeleteIcon
                                onClick={async () => await deleteUser(u.id)}
                              />
                            </span>
                          </Tooltip>
                          <Tooltip
                            content={
                              isTableRowBeingEdited === i
                                ? t("tableUsersActionTooltipSave")
                                : t("tableUsersActionTooltipEdit")
                            }
                          >
                            <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                              {isTableRowBeingEdited === i ? (
                                <SaveIcon
                                  onClick={async () => {
                                    await patchUser(u.id);
                                    setIsTableRowBeingEdited(undefined);
                                  }}
                                />
                              ) : (
                                <EditIcon
                                  onClick={() => {
                                    setUserFirstName(u.first_name);
                                    setUserLastName(u.last_name);
                                    setUserFederationId(u.federation_id);
                                    setUserTelegramId(u.telegram_id);
                                    setIsTableRowBeingEdited(i);
                                  }}
                                />
                              )}
                            </span>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>
                        <TableCellEditable
                          value={u.first_name}
                          currentIndex={i}
                          index={isTableRowBeingEdited}
                          isRequired={true}
                          onChangeHook={setUserFirstName}
                        />
                      </TableCell>
                      <TableCell>
                        <TableCellEditable
                          value={u.last_name}
                          currentIndex={i}
                          index={isTableRowBeingEdited}
                          onChangeHook={setUserLastName}
                        />
                      </TableCell>
                      <TableCell>
                        <TableCellEditable
                          value={u.federation_id}
                          currentIndex={i}
                          index={isTableRowBeingEdited}
                          onChangeHook={setUserFederationId}
                        />
                      </TableCell>
                      <TableCell>
                        <TableCellEditable
                          value={u.telegram_id}
                          currentIndex={i}
                          index={isTableRowBeingEdited}
                          onChangeHook={setUserTelegramId}
                        />
                      </TableCell>
                    </TableRow>,
                  ];
                })}
              </TableBody>
            </Table>
            <Divider />
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
});
