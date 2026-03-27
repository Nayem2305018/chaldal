// useAuthState hook removed - authentication has been removed

const useAuthState = () => {
  return { user: null, setUser: () => {}, admin: null, setAdmin: () => {} };
};

export default useAuthState;
