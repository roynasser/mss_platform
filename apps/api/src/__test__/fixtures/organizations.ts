export const organizationFixtures = {
  mssProvider: {
    id: 1,
    name: 'MSS Security Solutions',
    type: 'mss_provider',
    status: 'active',
    settings: {
      maxUsers: 100,
      features: ['monitoring', 'incident_response', 'reporting'],
    },
    created_at: new Date(),
    updated_at: new Date(),
  },

  customerOrg: {
    id: 2,
    name: 'Customer Corporation',
    type: 'customer',
    status: 'active',
    settings: {
      maxUsers: 50,
      features: ['monitoring', 'reporting'],
    },
    created_at: new Date(),
    updated_at: new Date(),
  },

  enterpriseCustomer: {
    id: 3,
    name: 'Enterprise Customer Inc',
    type: 'customer',
    status: 'active',
    settings: {
      maxUsers: 200,
      features: ['monitoring', 'incident_response', 'reporting', 'advanced_analytics'],
    },
    created_at: new Date(),
    updated_at: new Date(),
  },

  inactiveOrg: {
    id: 4,
    name: 'Inactive Organization',
    type: 'customer',
    status: 'inactive',
    settings: {
      maxUsers: 10,
      features: ['monitoring'],
    },
    created_at: new Date(),
    updated_at: new Date(),
  },
}

export const createTestOrganization = (overrides = {}) => {
  const defaultOrg = {
    name: 'Test Organization',
    type: 'customer',
    status: 'active',
    settings: {
      maxUsers: 25,
      features: ['monitoring', 'reporting'],
    },
    created_at: new Date(),
    updated_at: new Date(),
  }

  return { ...defaultOrg, ...overrides }
}

export const createMSSProvider = (overrides = {}) => createTestOrganization({
  ...organizationFixtures.mssProvider,
  ...overrides,
})

export const createCustomerOrganization = (overrides = {}) => createTestOrganization({
  ...organizationFixtures.customerOrg,
  ...overrides,
})