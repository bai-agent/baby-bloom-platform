export default function NannyProfilePage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold">Nanny Profile</h1>
      <p className="mt-2 text-muted-foreground">Profile ID: {params.id}</p>
    </div>
  );
}
