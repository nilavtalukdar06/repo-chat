import { useSearchParams } from "react-router";
import { CreateRepositoryDialog } from "@/features/repositories/components/create-repository-dialog";
import { RepositoryGrid } from "@/features/repositories/components/repository-grid";
import { RepositoryPagination } from "@/features/repositories/components/repository-pagination";
import { RepositorySearch } from "@/features/repositories/components/repository-search";
import { useRepositories } from "@/features/repositories/hooks";

const PAGE_SIZE = 12;

export default function Repositories() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const search = searchParams.get("search") ?? "";
  const repositories = useRepositories({ page, limit: PAGE_SIZE, search });
  const total = repositories.data?.meta.total;

  function buildParams(next: { page?: number; search?: string }) {
    const params = new URLSearchParams();
    const nextSearch = next.search ?? search;
    const nextPage = next.page ?? page;
    if (nextSearch) params.set("search", nextSearch);
    if (nextPage > 1) params.set("page", String(nextPage));
    return params;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-normal">Repositories</h1>
            {total !== undefined ? (
              <span className="text-xs font-light text-muted-foreground">
                {total}
              </span>
            ) : null}
          </div>
          <CreateRepositoryDialog />
        </header>
        <RepositorySearch
          defaultValue={search}
          onSearch={(value) =>
            setSearchParams(buildParams({ search: value, page: 1 }))
          }
        />
        <RepositoryGrid
          query={repositories}
          skeletonCount={6}
          search={search}
          emptyAction={<CreateRepositoryDialog />}
        />
        <RepositoryPagination
          page={page}
          totalPages={repositories.data?.meta.totalPages ?? 0}
          getHref={(target) => `?${buildParams({ page: target })}`}
          onPageChange={(target) =>
            setSearchParams(buildParams({ page: target }))
          }
        />
      </div>
    </div>
  );
}
