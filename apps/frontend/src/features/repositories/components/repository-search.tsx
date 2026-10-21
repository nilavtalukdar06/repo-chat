import { SearchIcon } from "lucide-react";
import { useRef, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const DEBOUNCE_MS = 300;

type RepositorySearchProps = {
  defaultValue: string;
  onSearch: (value: string) => void;
};

export function RepositorySearch({
  defaultValue,
  onSearch,
}: RepositorySearchProps) {
  const [value, setValue] = useState(defaultValue);
  const timeoutRef = useRef<number | undefined>(undefined);

  function handleChange(next: string) {
    setValue(next);
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(
      () => onSearch(next.trim()),
      DEBOUNCE_MS,
    );
  }

  return (
    <InputGroup className="rounded sm:max-w-xs">
      <InputGroupInput
        type="search"
        placeholder="Search repositories"
        aria-label="Search repositories"
        className="font-light"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
      />
      <InputGroupAddon align="inline-start">
        <SearchIcon className="text-muted-foreground" />
      </InputGroupAddon>
    </InputGroup>
  );
}
