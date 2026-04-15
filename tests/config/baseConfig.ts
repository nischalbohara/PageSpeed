// If needed the user credential is to be extracted and saved here
export interface RoleCredentials {
  username?: string;
  password?: string;
  apikey?: string;
}

export interface BaseConfig {
  baseUrl: string;
  roles: {
    [role: string]: RoleCredentials;
  };
}

export interface CloudinaryConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

export const getOutsideConfig = (
  role: string,
): BaseConfig & RoleCredentials => {
  const config: BaseConfig = {
    baseUrl: process.env.Outside_Prod_URL || "",
    roles: {
      baseUser: {
        username: process.env.Outside_ADMIN_USERNAME || "",
        password: process.env.Outside_ADMIN_PASSWORD || "",
      },
    },
  };
  if (!config.roles[role]) {
    throw new Error(`Role "${role}" is not defined for Outside Base"`);
  }
  return { ...config, ...config.roles[role] };
};

export function getCustomerConfig(
  customer: string,
  role: string,
): BaseConfig & RoleCredentials {
  switch (customer) {
    case "Way": {
      const config: BaseConfig = {
        baseUrl: process.env.Way_QA_URL || "",
        roles: {
          wayQA: {
            username: process.env.Way_QA_ADMIN_USERNAME || "",
            password: process.env.Way_QA_ADMIN_PASSWORD || "",
          },
        },
      };
      if (!config.roles[role]) {
        throw new Error(
          `Role "${role}" is not defined for customer "${customer}"`,
        );
      }
      return { ...config, ...config.roles[role] };
    }
    case "PageSpeed": {
      const config: BaseConfig = {
        baseUrl: process.env.PS_URL || "",
        roles: {
          reportGen: {
            apikey: process.env.PS_APIKEY || "",
          },
        },
      };
      if (!config.roles[role]) {
        throw new Error(
          `Role "${role}" is not defined for customer "${customer}"`,
        );
      }
      return { ...config, ...config.roles[role] };
    }

    case "Statebags": {
      const config: BaseConfig = {
        baseUrl: process.env.STATEBAGS_STG_URL || "",
        roles: {
          statebagsQA: {
            username: process.env.STATEBAGS_QA_ADMIN_USERNAME || "",
            password: process.env.STATEBAGS_QA_ADMIN_PASSWORD || "",
          },
        },
      };
      if (!config.roles[role]) {
        throw new Error(
          `Role "${role}" is not defined for customer "${customer}"`,
        );
      }
      return { ...config, ...config.roles[role] };
    }
    // Add more Config as needed
    default:
      throw new Error(`Unknown customer: ${customer}`);
  }
}

export const getCloudinaryConfig = (): CloudinaryConfig => {
  const config: CloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
    api_key: process.env.CLOUDINARY_API_KEY || "",
    api_secret: process.env.CLOUDINARY_API_SECRET || "",
  };
  return { ...config };
};
