"use client";

import { createContext, useContext, useState } from "react";
import { accounts, type AccountId, type Account } from "@/data/accounts";

interface AccountContextValue {
  account: Account;
  accountId: AccountId;
  setAccountId: (id: AccountId) => void;
}

const AccountContext = createContext<AccountContextValue>({
  account: accounts.william,
  accountId: "william",
  setAccountId: () => {},
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountId] = useState<AccountId>("william");

  return (
    <AccountContext.Provider value={{ account: accounts[accountId], accountId, setAccountId }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
}
