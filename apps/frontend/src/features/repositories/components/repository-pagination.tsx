import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  const items: PageItem[] = [1];
  if (start > 2) items.push("ellipsis-start");
  for (let current = start; current <= end; current++) items.push(current);
  if (end < totalPages - 1) items.push("ellipsis-end");
  items.push(totalPages);
  return items;
}

type RepositoryPaginationProps = {
  page: number;
  totalPages: number;
  getHref: (page: number) => string;
  onPageChange: (page: number) => void;
};

export function RepositoryPagination({
  page,
  totalPages,
  getHref,
  onPageChange,
}: RepositoryPaginationProps) {
  if (totalPages <= 1) return null;

  function linkProps(target: number) {
    return {
      href: getHref(target),
      onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onPageChange(target);
      },
    };
  }

  return (
    <Pagination>
      <PaginationContent className="font-light">
        <PaginationItem>
          <PaginationPrevious
            {...linkProps(page - 1)}
            aria-disabled={page <= 1}
            className="rounded-md aria-disabled:pointer-events-none aria-disabled:opacity-50"
          />
        </PaginationItem>
        {getPageItems(page, totalPages).map((item) =>
          typeof item === "number" ? (
            <PaginationItem key={item}>
              <PaginationLink
                {...linkProps(item)}
                isActive={item === page}
                className="rounded-md"
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationEllipsis />
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            {...linkProps(page + 1)}
            aria-disabled={page >= totalPages}
            className="rounded-md aria-disabled:pointer-events-none aria-disabled:opacity-50"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
