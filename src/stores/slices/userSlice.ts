import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type User = {
  id: string;
  name: string;
  agenda: string;
};

export type UsersState = {
  users: User[];
};

const initialState: UsersState = {
  users: [],
};

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    addUser: {
      prepare(name: string) {
        return { payload: { id: nanoid(), name, agenda: "" } satisfies User };
      },
      reducer(state, action: PayloadAction<User>) {
        state.users.unshift(action.payload);
      },
    },
    updateUser(state, action: PayloadAction<{ id: string; name?: string; agenda?: string }>) {
      const u = state.users.find((x) => x.id === action.payload.id);
      if (!u) {
        return;
      }
      if (action.payload.name !== undefined) {
        u.name = action.payload.name;
      }
      if (action.payload.agenda !== undefined) {
        u.agenda = action.payload.agenda;
      }
    },
    deleteUser(state, action: PayloadAction<string>) {
      state.users = state.users.filter((u) => u.id !== action.payload);
    },
    reorderUser(state, action: PayloadAction<{ fromId: string; toId: string }>) {
      const { fromId, toId } = action.payload;
      if (fromId === toId) {
        return;
      }
      const from = state.users.findIndex((u) => u.id === fromId);
      const to = state.users.findIndex((u) => u.id === toId);
      if (from === -1 || to === -1) {
        return;
      }
      const [moved] = state.users.splice(from, 1);
      state.users.splice(to, 0, moved);
    },
    replaceUsers(state, action: PayloadAction<UsersState>) {
      state.users = action.payload.users;
    },
  },
});

export const { addUser, updateUser, deleteUser, reorderUser, replaceUsers } = userSlice.actions;
export default userSlice.reducer;
