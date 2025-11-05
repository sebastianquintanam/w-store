export const prismaMock = {
    product: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    customer: {
        upsert: jest.fn(),
    },
    transaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    $transaction: (fn: any) => fn(prismaMock),
};

export const wompiMock = {
    createTransaction: jest.fn(),
};
