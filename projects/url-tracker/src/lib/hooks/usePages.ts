import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useToast } from "@/lib/toast";

// ── Folders ──

export function useFolders() {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.pages.getFolders.queryOptions(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateFolder() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.pages.createFolder.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getFolders.queryKey() });
    },
  });
}

export function useRenameFolder() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.pages.renameFolder.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getFolders.queryKey() });
    },
  });
}

export function useDeleteFolder() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.pages.deleteFolder.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getFolders.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPages.queryKey() });
      showToast("Folder deleted", "success");
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to delete folder", "error");
    },
  });
}

export function useMovePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.pages.movePage.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPages.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getFolders.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPageDetail.queryKey() });
    },
  });
}

// ── Pages ──

export function usePreviewUrl(url: string | null) {
  const trpc = useTRPC();

  const isValid = url !== null && url.length > 0;
  // Validate URL format
  let parsed = false;
  if (isValid) {
    try { new URL(url); parsed = true; } catch { /* invalid */ }
  }

  return useQuery({
    ...trpc.pages.previewUrl.queryOptions({ url: url ?? "" }),
    enabled: isValid && parsed,
    staleTime: 0,
    retry: false,
  });
}

export function useTrackedPages(folderId?: number | null) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.pages.getPages.queryOptions(folderId !== undefined ? { folderId } : undefined),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  });
}

export function usePageDetail(pageId: number) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.pages.getPageDetail.queryOptions({ pageId }),
    enabled: pageId > 0,
    staleTime: 1000 * 60,
  });
}

export function useFieldHistory(fieldId: number, limit?: number) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.pages.getFieldHistory.queryOptions({ fieldId, limit }),
    enabled: fieldId > 0,
    staleTime: 1000 * 30,
  });
}

export function useAddPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.pages.addPage.mutationOptions(),
    onSuccess: (_data, vars) => {
      showToast(`"${vars.name || new URL(vars.url).hostname}" added`, "success");
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPages.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getFolders.queryKey() });
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to add page", "error");
    },
  });
}

export function useScrapePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.pages.scrapePage.mutationOptions(),
    onSuccess: (data, vars) => {
      const errors = data.values.filter((v) => v.error);
      if (errors.length > 0) {
        const details = errors.map((e) => `${e.label}: ${e.error}`).join(" | ");
        showToast(`Scraped with ${errors.length} error(s): ${details}`, "error");
      } else {
        showToast(`Scraped ${data.values.length} field(s)`, "success");
      }
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPageDetail.queryKey({ pageId: vars.pageId }) });
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPages.queryKey() });
      // Invalidate all field history queries so field cards show new values
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getFieldHistory.queryKey() });
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Scrape failed", "error");
    },
  });
}

export function useRemovePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.pages.removePage.mutationOptions(),
    onSuccess: () => {
      showToast("Page removed", "success");
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPages.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getFolders.queryKey() });
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to remove page", "error");
    },
  });
}

export function useScrapeAllPages() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.pages.scrapeAllPages.mutationOptions(),
    onSuccess: (results) => {
      const ok = results.filter((r) => r.status === "ok").length;
      const errors = results.filter((r) => r.status.startsWith("error")).length;
      showToast(`Refreshed ${ok} page(s)${errors > 0 ? `, ${errors} error(s)` : ""}`, errors > 0 ? "error" : "success");
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPages.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getFieldHistory.queryKey() });
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Batch scrape failed", "error");
    },
  });
}

// ── Field management ──

export function useUpdateField() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.pages.updateField.mutationOptions(),
    onSuccess: () => {
      // Invalidate any page detail query that might contain this field
      // We don't know the pageId here, so we invalidate all page detail queries
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPageDetail.queryKey() });
      showToast("Field updated", "success");
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to update field", "error");
    },
  });
}

export function useAddField() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.pages.addField.mutationOptions(),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPageDetail.queryKey({ pageId: data.pageId }) });
      showToast("Field added", "success");
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to add field", "error");
    },
  });
}

export function useDeleteField() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.pages.deleteField.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPageDetail.queryKey() });
      showToast("Field deleted", "success");
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to delete field", "error");
    },
  });
}

export function useReorderFields() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.pages.reorderFields.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPageDetail.queryKey() });
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to reorder fields", "error");
    },
  });
}

// ── Page settings ──

export function useUpdatePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.pages.updatePage.mutationOptions(),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPageDetail.queryKey({ pageId: vars.pageId }) });
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getPages.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.pages.getFolders.queryKey() });
      showToast("Page updated", "success");
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : "Failed to update page", "error");
    },
  });
}
