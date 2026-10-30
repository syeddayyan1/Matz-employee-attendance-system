import api from "../axios";

export const adminLogin = async (email, password) => {
    const response = await api.post("/admin/login",
        {email,password,
  });

  return response.data;
};