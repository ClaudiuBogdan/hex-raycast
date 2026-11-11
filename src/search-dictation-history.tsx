import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { downloadUrl, findHex } from "./hex/cli";
import { explanation, showHex } from "./hex/feedback";
import { type History, HexError, transcriptMarkdown } from "./hex/protocol";

const pageSize = 50;
const resultCap = 200;
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function SearchDictationHistory() {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(pageSize);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    query: string;
    limit: number;
    revision: number;
    data?: History;
    error?: unknown;
  }>();
  const current =
    result?.query === query && result.limit === limit && result.revision === revision ? result : undefined;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        try {
          const hex = await findHex();
          if (controller.signal.aborted) return;
          const data = await hex.history(query, limit, controller.signal);
          if (!controller.signal.aborted) setResult({ query, limit, revision, data });
        } catch (error) {
          if (!controller.signal.aborted) setResult({ query, limit, revision, error });
        }
      },
      query ? 180 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, limit, revision]);

  const refresh = () => setRevision((value) => value + 1);
  const showMore = () => setLimit((value) => Math.min(value + pageSize, resultCap));
  const history = current?.data;
  const error = current?.error;
  const canShowMore = history?.truncated && limit < resultCap;
  const emptyTitle = error ? "Could Not Read History" : query ? "No Matching Transcripts" : "No Saved Transcripts";
  const emptyDescription = error
    ? explanation(error)
    : history?.retention === "off"
      ? "History is off in Hex. New dictations are not saved."
      : undefined;

  return (
    <List
      navigationTitle="Hex Dictation History"
      searchBarPlaceholder="Search all retained transcripts"
      isLoading={!current}
      isShowingDetail={Boolean(history?.entries.length)}
      filtering={false}
      onSearchTextChange={(text) => {
        const next = text.trim();
        if (next === query) return;
        setLimit(pageSize);
        setQuery(next);
      }}
    >
      {current && !history?.entries.length && (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.Document}
          title={emptyTitle}
          description={emptyDescription}
          actions={
            <ActionPanel>
              {error instanceof HexError && error.code === "missing" && (
                <Action.OpenInBrowser title="Get Hex" url={downloadUrl} />
              )}
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
              <Action title="Open History in Hex" onAction={() => showHex("history")} />
            </ActionPanel>
          }
        />
      )}
      <List.Section
        title={query ? "Search Results" : "Recent Dictations"}
        subtitle={history?.retention === "off" ? "History Off" : undefined}
      >
        {history?.entries.map((entry) => {
          const date = dateFormat.format(entry.timestamp_ms);
          const final = entry.final_text.trim() ? entry.final_text : undefined;
          const raw = entry.raw_text?.trim() ? entry.raw_text : undefined;
          const distinctRaw = raw && raw !== final ? raw : undefined;
          const primary = final ?? raw;
          const preview = primary?.replace(/\s+/g, " ").trim().slice(0, 120) || "No transcript text";
          const detail = [];
          if (final) detail.push(`### Final Transcript\n${transcriptMarkdown(final)}`);
          if (distinctRaw) detail.push(`### Raw Transcript\n${transcriptMarkdown(distinctRaw)}`);
          return (
            <List.Item
              key={entry.id}
              icon={Icon.Document}
              title={preview}
              subtitle={date}
              detail={
                <List.Item.Detail
                  markdown={detail.join("\n\n") || "No transcript text."}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Recorded" text={date} />
                      {entry.application && <List.Item.Detail.Metadata.Label title="App" text={entry.application} />}
                      {entry.mode && <List.Item.Detail.Metadata.Label title="Mode" text={entry.mode} />}
                      <List.Item.Detail.Metadata.Label title="Kind" text={entry.kind.replaceAll("_", " ")} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {final && (
                    <>
                      <Action.Paste title="Paste Transcript" content={final} />
                      <Action.CopyToClipboard title="Copy Transcript" content={final} concealed />
                    </>
                  )}
                  {distinctRaw && (
                    <>
                      <Action.Paste title="Paste Raw Transcript" content={distinctRaw} />
                      <Action.CopyToClipboard title="Copy Raw Transcript" content={distinctRaw} concealed />
                    </>
                  )}
                  <Action title="Open History in Hex" onAction={() => showHex("history")} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
                  {canShowMore && <Action title="Show More" onAction={showMore} />}
                </ActionPanel>
              }
            />
          );
        })}
        {canShowMore && (
          <List.Item
            icon={Icon.ChevronDown}
            title="Show More"
            actions={
              <ActionPanel>
                <Action title="Show More" onAction={showMore} />
              </ActionPanel>
            }
          />
        )}
        {history?.truncated && !canShowMore && (
          <List.Item title="Refine Your Search to See More Results" icon={Icon.MagnifyingGlass} />
        )}
      </List.Section>
    </List>
  );
}
