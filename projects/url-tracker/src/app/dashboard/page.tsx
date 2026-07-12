import DashboardClient from "./dashboard-client";

export default async function DashboardPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const folderParam = searchParams.folder?.toString() ?? null;
  return <DashboardClient folderParam={folderParam} />;
}
