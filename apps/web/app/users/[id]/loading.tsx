import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";

function SkeletonLine({ w }: { w: string }) {
  return <div className={`h-3 ${w} animate-pulse rounded bg-muted`} />;
}

export default function LoadingUserProfile() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Loading profile…</CardTitle>
              <CardDescription>Fetching involvement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SkeletonLine w="w-10/12" />
              <SkeletonLine w="w-9/12" />
              <SkeletonLine w="w-8/12" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Just a moment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SkeletonLine w="w-full" />
              <SkeletonLine w="w-11/12" />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Loading list…</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-background p-3">
                <SkeletonLine w="w-6/12" />
                <div className="mt-2">
                  <SkeletonLine w="w-10/12" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

