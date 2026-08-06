export type TabKey = "teachers" | "students" | "settings";

export interface ListQueryState<T> {
  isLoading: boolean;
  isError: boolean;
  data: T[] | undefined;
}
