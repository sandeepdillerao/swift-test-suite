import type { 
  User, Organization, Project, TestSuite, TestCase, 
  TestRun, DashboardStats, ActivityItem 
} from '@/types';

// Mock Users
export const mockUsers: User[] = [
  { id: '1', email: 'john@testflow.io', name: 'John Doe', role: 'admin', organizationId: '1', avatar: '' },
  { id: '2', email: 'jane@testflow.io', name: 'Jane Smith', role: 'qa_lead', organizationId: '1', avatar: '' },
  { id: '3', email: 'bob@testflow.io', name: 'Bob Wilson', role: 'tester', organizationId: '1', avatar: '' },
  { id: '4', email: 'alice@testflow.io', name: 'Alice Brown', role: 'tester', organizationId: '1', avatar: '' },
];

// Mock Organization
export const mockOrganization: Organization = {
  id: '1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  createdAt: '2024-01-01T00:00:00Z',
};

// Mock Projects
export const mockProjects: Project[] = [
  { id: '1', name: 'E-Commerce Platform', description: 'Main e-commerce application testing', organizationId: '1', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-06-20T00:00:00Z', testCasesCount: 245, passRate: 87.5 },
  { id: '2', name: 'Mobile App', description: 'iOS and Android app testing', organizationId: '1', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-06-18T00:00:00Z', testCasesCount: 182, passRate: 92.3 },
  { id: '3', name: 'API Gateway', description: 'REST API integration tests', organizationId: '1', createdAt: '2024-03-10T00:00:00Z', updatedAt: '2024-06-19T00:00:00Z', testCasesCount: 98, passRate: 95.1 },
];

// Mock Test Suites
export const mockTestSuites: TestSuite[] = [
  { id: '1', name: 'Authentication', description: 'User authentication and authorization tests', projectId: '1', testCasesCount: 24, createdAt: '2024-01-15T00:00:00Z' },
  { id: '2', name: 'Shopping Cart', description: 'Cart functionality tests', projectId: '1', testCasesCount: 35, createdAt: '2024-01-16T00:00:00Z' },
  { id: '3', name: 'Checkout', description: 'Checkout process tests', projectId: '1', testCasesCount: 42, createdAt: '2024-01-17T00:00:00Z' },
  { id: '4', name: 'User Profile', description: 'User profile management tests', projectId: '1', testCasesCount: 18, createdAt: '2024-01-18T00:00:00Z' },
  { id: '5', name: 'Search & Filters', description: 'Product search and filtering tests', projectId: '1', testCasesCount: 28, createdAt: '2024-01-19T00:00:00Z' },
];

// Mock Test Cases
export const mockTestCases: TestCase[] = [
  {
    id: 'TC-001',
    title: 'User can login with valid credentials',
    description: 'Verify that a user can successfully log in with valid email and password',
    preconditions: 'User must have a registered account',
    steps: [
      { id: '1', order: 1, action: 'Navigate to login page', expectedResult: 'Login page is displayed' },
      { id: '2', order: 2, action: 'Enter valid email', expectedResult: 'Email is accepted' },
      { id: '3', order: 3, action: 'Enter valid password', expectedResult: 'Password is masked' },
      { id: '4', order: 4, action: 'Click Login button', expectedResult: 'User is redirected to dashboard' },
    ],
    expectedResult: 'User is logged in and sees dashboard',
    priority: 'critical',
    type: 'manual',
    status: 'passed',
    suiteId: '1',
    projectId: '1',
    tags: ['login', 'authentication', 'smoke'],
    createdBy: '1',
    assignedTo: '3',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-06-20T14:30:00Z',
    lastRunAt: '2024-06-20T14:30:00Z',
  },
  {
    id: 'TC-002',
    title: 'User cannot login with invalid password',
    description: 'Verify that login fails with incorrect password',
    preconditions: 'User must have a registered account',
    steps: [
      { id: '1', order: 1, action: 'Navigate to login page', expectedResult: 'Login page is displayed' },
      { id: '2', order: 2, action: 'Enter valid email', expectedResult: 'Email is accepted' },
      { id: '3', order: 3, action: 'Enter invalid password', expectedResult: 'Password is masked' },
      { id: '4', order: 4, action: 'Click Login button', expectedResult: 'Error message is displayed' },
    ],
    expectedResult: 'Error message shows invalid credentials',
    priority: 'critical',
    type: 'manual',
    status: 'passed',
    suiteId: '1',
    projectId: '1',
    tags: ['login', 'authentication', 'negative'],
    createdBy: '1',
    assignedTo: '3',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-06-20T14:35:00Z',
    lastRunAt: '2024-06-20T14:35:00Z',
  },
  {
    id: 'TC-003',
    title: 'Add product to cart',
    description: 'Verify user can add a product to shopping cart',
    preconditions: 'User is logged in',
    steps: [
      { id: '1', order: 1, action: 'Navigate to product page', expectedResult: 'Product details are displayed' },
      { id: '2', order: 2, action: 'Click Add to Cart button', expectedResult: 'Product is added, cart count updates' },
    ],
    expectedResult: 'Product appears in cart with correct quantity',
    priority: 'high',
    type: 'automated',
    status: 'passed',
    suiteId: '2',
    projectId: '1',
    tags: ['cart', 'product', 'smoke'],
    createdBy: '2',
    assignedTo: '4',
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-06-19T11:00:00Z',
    lastRunAt: '2024-06-19T11:00:00Z',
  },
  {
    id: 'TC-004',
    title: 'Remove product from cart',
    description: 'Verify user can remove a product from shopping cart',
    preconditions: 'User is logged in and has items in cart',
    steps: [
      { id: '1', order: 1, action: 'Navigate to cart page', expectedResult: 'Cart contents are displayed' },
      { id: '2', order: 2, action: 'Click Remove button on product', expectedResult: 'Product is removed, total updates' },
    ],
    expectedResult: 'Product is removed and cart total is recalculated',
    priority: 'high',
    type: 'automated',
    status: 'failed',
    suiteId: '2',
    projectId: '1',
    tags: ['cart', 'remove'],
    createdBy: '2',
    assignedTo: '4',
    createdAt: '2024-01-16T09:30:00Z',
    updatedAt: '2024-06-19T11:15:00Z',
    lastRunAt: '2024-06-19T11:15:00Z',
  },
  {
    id: 'TC-005',
    title: 'Complete checkout with credit card',
    description: 'Verify user can complete purchase using credit card',
    preconditions: 'User is logged in and has items in cart',
    steps: [
      { id: '1', order: 1, action: 'Navigate to checkout', expectedResult: 'Checkout page loads' },
      { id: '2', order: 2, action: 'Enter shipping address', expectedResult: 'Address is validated' },
      { id: '3', order: 3, action: 'Select credit card payment', expectedResult: 'Payment form appears' },
      { id: '4', order: 4, action: 'Enter card details', expectedResult: 'Card is validated' },
      { id: '5', order: 5, action: 'Click Place Order', expectedResult: 'Order is confirmed' },
    ],
    expectedResult: 'Order confirmation page with order number',
    priority: 'critical',
    type: 'manual',
    status: 'blocked',
    suiteId: '3',
    projectId: '1',
    tags: ['checkout', 'payment', 'critical-path'],
    createdBy: '1',
    assignedTo: '3',
    createdAt: '2024-01-17T08:00:00Z',
    updatedAt: '2024-06-18T16:00:00Z',
    lastRunAt: '2024-06-18T16:00:00Z',
  },
  {
    id: 'TC-006',
    title: 'Search products by keyword',
    description: 'Verify product search returns relevant results',
    steps: [
      { id: '1', order: 1, action: 'Enter search term in search box', expectedResult: 'Search suggestions appear' },
      { id: '2', order: 2, action: 'Press Enter or click search', expectedResult: 'Search results page loads' },
    ],
    expectedResult: 'Relevant products are displayed',
    priority: 'medium',
    type: 'automated',
    status: 'not_run',
    suiteId: '5',
    projectId: '1',
    tags: ['search', 'product'],
    createdBy: '2',
    createdAt: '2024-01-19T10:00:00Z',
    updatedAt: '2024-01-19T10:00:00Z',
  },
  {
    id: 'TC-007',
    title: 'Filter products by price range',
    description: 'Verify price filter works correctly',
    steps: [
      { id: '1', order: 1, action: 'Navigate to product listing', expectedResult: 'Products are displayed' },
      { id: '2', order: 2, action: 'Set min and max price filter', expectedResult: 'Filter is applied' },
    ],
    expectedResult: 'Only products within price range are shown',
    priority: 'medium',
    type: 'automated',
    status: 'passed',
    suiteId: '5',
    projectId: '1',
    tags: ['filter', 'price', 'product'],
    createdBy: '2',
    assignedTo: '4',
    createdAt: '2024-01-19T10:30:00Z',
    updatedAt: '2024-06-20T09:00:00Z',
    lastRunAt: '2024-06-20T09:00:00Z',
  },
  {
    id: 'TC-008',
    title: 'Update user profile information',
    description: 'Verify user can update their profile details',
    preconditions: 'User is logged in',
    steps: [
      { id: '1', order: 1, action: 'Navigate to profile settings', expectedResult: 'Profile page loads' },
      { id: '2', order: 2, action: 'Update name field', expectedResult: 'Name is updated in form' },
      { id: '3', order: 3, action: 'Click Save', expectedResult: 'Success message appears' },
    ],
    expectedResult: 'Profile is updated successfully',
    priority: 'low',
    type: 'manual',
    status: 'in_progress',
    suiteId: '4',
    projectId: '1',
    tags: ['profile', 'user'],
    createdBy: '1',
    assignedTo: '3',
    createdAt: '2024-01-18T11:00:00Z',
    updatedAt: '2024-06-20T15:00:00Z',
  },
];

// Mock Test Runs
export const mockTestRuns: TestRun[] = [
  {
    id: '1',
    name: 'Sprint 24 Regression',
    projectId: '1',
    status: 'active',
    testCases: [],
    createdBy: '2',
    assignedTo: '3',
    startedAt: '2024-06-20T08:00:00Z',
    passRate: 75.5,
  },
  {
    id: '2',
    name: 'Release 2.5 Smoke Test',
    projectId: '1',
    status: 'completed',
    testCases: [],
    createdBy: '2',
    assignedTo: '4',
    startedAt: '2024-06-18T09:00:00Z',
    completedAt: '2024-06-18T17:00:00Z',
    passRate: 92.0,
  },
];

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  totalTestCases: 245,
  passedTests: 198,
  failedTests: 18,
  blockedTests: 12,
  notRunTests: 17,
  passRate: 87.5,
  activeTestRuns: 3,
  recentActivity: [
    { id: '1', type: 'test_executed', description: 'Executed TC-001: User can login with valid credentials', userId: '3', userName: 'Bob Wilson', timestamp: '2024-06-20T14:30:00Z' },
    { id: '2', type: 'test_created', description: 'Created TC-008: Update user profile information', userId: '1', userName: 'John Doe', timestamp: '2024-06-20T14:00:00Z' },
    { id: '3', type: 'run_started', description: 'Started Sprint 24 Regression test run', userId: '2', userName: 'Jane Smith', timestamp: '2024-06-20T08:00:00Z' },
    { id: '4', type: 'test_updated', description: 'Updated TC-005: Complete checkout with credit card', userId: '3', userName: 'Bob Wilson', timestamp: '2024-06-19T16:00:00Z' },
    { id: '5', type: 'run_completed', description: 'Completed Release 2.5 Smoke Test', userId: '4', userName: 'Alice Brown', timestamp: '2024-06-18T17:00:00Z' },
  ],
};

// Simulate API delay
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
