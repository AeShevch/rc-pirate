import Head from "next/head";
import styles from "@/styles/Home.module.css";
import { Card, Space, Alert, Form, Input, Button } from "antd";
import { useState } from "react";
import { ParserResponsePayload } from "@/pages/api/parser";
import axios from "axios";

export type ParserFormFields = {
  url: string;
  containerSelector: string;
};

export default function Home() {
  const [form] = Form.useForm<ParserFormFields>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [parserResult, setParserResult] =
    useState<ParserResponsePayload | null>(null);

  const getRichContent = async ({
    url,
    containerSelector,
  }: ParserFormFields): Promise<ParserResponsePayload | void> => {
    try {
      const { data } = await axios.get<ParserResponsePayload>(
        `/api/parser?url=${url}&containerSelector=${containerSelector}`
      );

      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMessage(err.message);
      } else {
        console.log("unexpected err: ", err);
        setErrorMessage(`🦜 Неожиданная ошибка! Позвать разраба на мостик!`);
      }
    }
  };

  const onSubmit = (formFields: ParserFormFields) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setParserResult(null);
    setIsLoading(true);

    getRichContent(formFields)
      .then((res) => {
        if (!res) return;

        if (res.err) {
          setErrorMessage(res.err);
          return;
        }

        setParserResult(res);

        setSuccessMessage(
          `🦜 Попутный ветер! Абордаж прошёл успешно! Что делаем с пленником?`
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <>
      <Head>
        <title>🏴‍☠️ Yo-ho-ho!</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <Card
          title="🏴‍☠️ Rich Content Pirate v0.9.0-beta"
          style={{ width: "40rem" }}
        >
          <Form form={form} onFinish={onSubmit} layout="vertical">
            <Space direction="vertical" size={40} style={{ width: "100%" }}>
              <Alert
                message={
                  <>
                    «Реквизировать. Мы реквизируем этот рич контент. Это морской
                    термин» <br /> – Джек Воробей
                  </>
                }
                type="info"
              />

              <div>
                <Form.Item
                  name="url"
                  label="Ссылка на страницу с «реквизируемым» контентом"
                  hasFeedback
                  rules={[
                    { required: true },
                    { type: "url", warningOnly: true },
                    {
                      type: "string",
                      min: 6,
                    },
                  ]}
                >
                  <Input
                    disabled={isLoading}
                    placeholder="Например, https://istyle.cz/macbook-pro-14-...-stribrny.html"
                  />
                </Form.Item>
                <Form.Item
                  name="containerSelector"
                  hasFeedback
                  label="html-cелектор контейнера c контентом (На istyle.cz это обычно .block-static-block)"
                  initialValue=".block-static-block"
                  rules={[{ required: true }, { type: "string" }]}
                >
                  <Input disabled={isLoading} />
                </Form.Item>
              </div>

              {!!errorMessage && <Alert message={errorMessage} type="error" />}

              <Button type="primary" htmlType="submit" loading={isLoading}>
                ⛵ Поднять паруса!
              </Button>

              <Space direction="vertical">
                {!!successMessage && (
                  <Alert message={successMessage} type="success" />
                )}

                {!!parserResult && (
                  <>
                    {parserResult.previewUrl && (
                      <a
                        rel="noreferrer"
                        href={parserResult.previewUrl}
                        target="_blank"
                        style={{ color: `#1677ff` }}
                      >
                        Посмотреть превью (в новой вкладке)
                      </a>
                    )}
                    {parserResult.downloadUrl && (
                      <a
                        rel="noreferrer"
                        href={parserResult.downloadUrl}
                        style={{
                          color: `#1677ff`,
                          borderBottom: `1px dashed currentColor`,
                        }}
                        download
                        target="_blank"
                      >
                        Скачать архив
                      </a>
                    )}
                  </>
                )}
              </Space>
            </Space>
          </Form>
        </Card>
      </main>
    </>
  );
}