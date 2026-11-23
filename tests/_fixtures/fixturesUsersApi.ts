import { test as base, request as apiRequest } from '@playwright/test';
import { UsersApi } from '../../src/api/endpoints/UsersApi';
import { generateNewUserData } from '../../src/common/testData/generateNewUserData';

export const test = base.extend<{
  usersApi;
  newUserData;
  newUsersData;
  registeredUser;
  registeredUsers;
  userRequests;
}>({
  usersApi: async ({ request }, use) => {
    const client = new UsersApi(request);

    await use(client);
  },

  newUserData: async ({ logger }, use) => {
    const userData = generateNewUserData(logger);

    await use(userData);
  },

  newUsersData: async ({ logger, usersNumber }, use) => {
    const users = Array.from({ length: usersNumber }, () =>
      generateNewUserData(logger),
    );

    await use(users);
  },

  registeredUser: async ({ usersApi, newUserData }, use) => {
    const response = await usersApi.registerNewUser(newUserData);

    await usersApi.assertSuccessResponseCode(response);

    newUserData.token = await usersApi.parseTokenFromBody(response);

    await use(newUserData);
  },

  registeredUsers: async ({ usersApi, newUsersData }, use) => {
    for (const user of newUsersData) {
      const response = await usersApi.registerNewUser(user);

      await usersApi.assertSuccessResponseCode(response);

      user.token = await usersApi.parseTokenFromBody(response);
    }

    await use(newUsersData);
  },

  userRequests: async ({ registeredUsers, baseURL }, use) => {
    const contexts = [];

    try {
      for (const user of registeredUsers) {
        const context = await apiRequest.newContext({
          baseURL,
          extraHTTPHeaders: {
            authorization: `Token ${user.token}`,
            'content-type': 'application/json',
          },
        });

        contexts.push(context);
      }

      await use(contexts);
    } finally {
      for (const context of contexts) {
        await context.dispose();
      }
    }
  },
});
