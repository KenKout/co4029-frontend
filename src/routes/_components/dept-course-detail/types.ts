export type TabKey = "teachers" | "students";

export interface ListQueryState<T> {
  isLoading: boolean;
  isError: boolean;
  data: T[] | undefined;
}
