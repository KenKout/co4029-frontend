import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import { queryClient } from "./lib/queryClient";
import { i18nReady } from "./i18n";
import "./fonts.css";
import "./app.css";

const ReactQueryDevtools = React.lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  })),
);

// Render is gated on the locale catalog: components render translated text
// on their first mount instead of flashing raw keys while the async i18next
// backend finishes.
i18nReady.then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {import.meta.env.DEV ? (
          <React.Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </React.Suspense>
        ) : null}
      </QueryClientProvider>
    </React.StrictMode>,
  );
});
