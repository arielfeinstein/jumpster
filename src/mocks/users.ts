export type MockUser = {
    id: string;
    username: string;
    email: string;
};

export const mockCurrentUser: MockUser = {
    id: 'user-1',
    username: 'PixelAriel',
    email: 'arielfainshtein@icloud.com',
};

export const mockUsers: MockUser[] = [
    mockCurrentUser,
    {
        id: 'user-2',
        username: 'BlockBuster42',
        email: 'blockbuster@example.com',
    },
];
