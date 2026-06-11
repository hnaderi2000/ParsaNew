

import axios from 'axios';
import serverAddress from '../constants/contants';

// export const saveSystemVariables = async (variables) => {
//   try {
//     // اعتبارسنجی در سمت کلاینت
//     if (!variables.Year) {
//       throw new Error('سال نمی‌تواند خالی باشد');
//     }

//     const response = await axios.post(`${serverAddress}/system-variables`, variables, {
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });
//     return response.data;
//   } catch (error) {
//     throw new Error(error.response?.data?.message || 'خطا در ذخیره متغیرها');
//   }
// };


export const saveSystemVariables = async (variables) => {
  try {
    if (!variables.Year) {
      throw new Error('سال نمی‌تواند خالی باشد');
    }

    // بررسی وجود سال در سرور
    const existing = await getSystemVariablesByYear(variables.Year);
    
    let response;
    if (existing) {
      // اگر وجود دارد، UPDATE انجام دهید
      response = await axios.put(`${serverAddress}/system-variables/${variables.Year}`, variables);
    } else {
      // اگر وجود ندارد، INSERT انجام دهید
      response = await axios.post(`${serverAddress}/system-variables`, variables);
    }
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'خطا در ذخیره متغیرها');
  }
};

export const getSystemVariablesByYear = async (Year) => {
  try {
    const response = await axios.get(`${serverAddress}/system-variables/${Year}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error(error.response?.data?.message || 'خطا در دریافت متغیرها');
  }
};

export const getAllSystemVariables = async () => {
  try {
    const response = await axios.get(`${serverAddress}/system-variables`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'خطا در دریافت لیست متغیرها');
  }
};

export const deleteSystemVariables = async (Year) => {
  try {
    const response = await axios.delete(`${serverAddress}/system-variables/${Year}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'خطا در حذف متغیرها');
  }
};