export type TabKey = "teachers" | "students" | "career-paths" | "settings";

export interface ListQueryState<T> {
  isLoading: boolean;
  isError: boolean;
  data: T[] | undefined;
}
