import { Action, ActionPanel, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { bundleId, downloadUrl, findHex } from "./hex/cli";
import { explanation, reportError, showHex } from "./hex/feedback";
import { type Flag, flagSections, HexError, type Lab } from "./hex/protocol";

async function readSettings() {
  const hex = await findHex();
  const [flags, labs] = await Promise.allSettled([hex.settings(), hex.labs()]);
  if (flags.status === "rejected") throw flags.reason;
  return {
    ...flagSections(flags.value, labs.status === "fulfilled" ? labs.value : []),
    labsError: labs.status === "rejected" ? explanation(labs.reason) : undefined,
  };
}

type Result = { data: Awaited<ReturnType<typeof readSettings>> } | { error: unknown };

function flagTitle(key: string) {
  return key
    .replace(/^labs\./, "")
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function openLab(name: string) {
  try {
    const hex = await findHex();
    await open(await hex.labLink(name), bundleId);
  } catch (error) {
    await reportError("Could Not Open Hex Labs", error);
  }
}

export default function SearchSettings() {
  const [result, setResult] = useState<Result>();
  const [loading, setLoading] = useState(true);
  const updating = useRef(false);

  async function load() {
    try {
      setResult({ data: await readSettings() });
    } catch (error) {
      setResult({ error });
    }
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  async function refresh() {
    if (updating.current) return;
    updating.current = true;
    setLoading(true);
    try {
      await load();
    } finally {
      updating.current = false;
      setLoading(false);
    }
  }

  async function changeFlag(flag: Flag, title: string) {
    if (updating.current) return;
    updating.current = true;
    setLoading(true);
    try {
      const hex = await findHex();
      await hex.changeFlag(flag.key, !flag.value);
      await showToast({
        title: flag.value ? "Turned Off" : "Turned On",
        message: title,
        style: Toast.Style.Success,
      });
    } catch (error) {
      await reportError("Could Not Change Setting", error, refresh);
    } finally {
      await load();
      updating.current = false;
      setLoading(false);
    }
  }

  function flagRow(flag: Flag & { lab?: Lab }) {
    const { lab } = flag;
    const title = flagTitle(lab?.name ?? flag.key);
    const description = lab?.description ?? flag.about;
    const state = lab?.state === "managed" ? "Managed" : flag.value ? "On" : "Off";
    return (
      <List.Item
        key={flag.key}
        title={title}
        subtitle={description}
        keywords={[flag.key, description, state]}
        accessories={[{ text: state }, ...(!flag.writable && state !== "Managed" ? [{ text: "Read Only" }] : [])]}
        actions={
          <ActionPanel>
            {flag.writable && !loading && (
              <Action title={flag.value ? "Turn off" : "Turn on"} onAction={() => changeFlag(flag, title)} />
            )}
            {lab && <Action title="Show in Hex Labs" onAction={() => openLab(lab.name)} />}
            <Action title="Open Hex Settings" onAction={() => showHex("settings")} />
            <Action title="Open Hex Output" onAction={() => showHex("modes")} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
          </ActionPanel>
        }
      />
    );
  }

  const data = result && "data" in result ? result.data : undefined;
  const error = result && "error" in result ? result.error : undefined;
  const code = error instanceof HexError ? error.code : undefined;

  async function launchHex() {
    try {
      const hex = await findHex();
      await hex.start();
      await refresh();
    } catch (error) {
      await reportError("Could Not Launch Hex", error);
    }
  }

  return (
    <List
      isLoading={loading}
      navigationTitle="Hex Settings & Labs"
      searchBarPlaceholder="Search flags by name, description, or key"
      filtering={{ keepSectionOrder: true }}
    >
      <List.EmptyView
        title={error ? "Could Not Read Hex Settings" : "No Matching Flags"}
        description={error ? explanation(error) : undefined}
        actions={
          <ActionPanel>
            {code === "missing" && <Action.OpenInBrowser title="Get Hex" url={downloadUrl} />}
            {code === "not-running" && <Action title="Launch Hex" onAction={launchHex} />}
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
            <Action title="Open Hex Settings" onAction={() => showHex("settings")} />
          </ActionPanel>
        }
      />
      {data && (
        <>
          <List.Section title="Labs">
            {data.labsError && (
              <List.Item
                icon={Icon.Warning}
                title="Could Not Read Labs"
                subtitle={data.labsError}
                actions={
                  <ActionPanel>
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
                    <Action title="Open Hex Settings" onAction={() => showHex("settings")} />
                  </ActionPanel>
                }
              />
            )}
            {data.labs.map(flagRow)}
          </List.Section>
          <List.Section title="Settings">{data.settings.map(flagRow)}</List.Section>
        </>
      )}
    </List>
  );
}
