import { configureStore } from "@reduxjs/toolkit";

import { undoMiddleware } from "@/lib/undo";

import ai from "./slices/aiSlice";
import settings from "./slices/settingsSlice";
import todos from "./slices/todoSlice";
import users from "./slices/userSlice";

export const makeStore = () =>
  configureStore({
    reducer: { todos, settings, users, ai },
    middleware: (getDefault) => getDefault().concat(undoMiddleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
