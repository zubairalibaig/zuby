"use client";

import { useEffect } from "react";

/**
 * Registers the service worker after the page is interactive, so registration
 * never competes with first paint on a mid-range Android phone — which is the
 * device the performance budget is written for.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // A failed registration must never surface to the user: the site works
        // identically without it.
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
