import { configureStore } from "@reduxjs/toolkit"
import todos from "./todoSlice"
import settings from "./settingsSlice"
import users from "./userSlice"
import ai from "./aiSlice"
import { undoMiddleware } from "./undo"

export const makeStore = () =>
  configureStore({
    reducer: { todos, settings, users, ai },
    middleware: (getDefault) => getDefault().concat(undoMiddleware),
  })

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
