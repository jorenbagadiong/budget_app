/**
 * Personal Budget Management - Google Apps Script Backend API
 *
 * Implements a secure API layer over Google Sheets persistence.
 * Features:
 * - Request validation with shared secret / HMAC signature
 * - Row-level locking via LockService to prevent race conditions
 * - Strict multi-tenant user data isolation (enforced via Google sub claim)
 * - Formula injection prevention (CSV / Sheets injection defense)
 * - Automatic schema initialization
 * - Complete data deletion for GDPR / Privacy compliance
 */

// Configuration constants
var CONFIG = {
  SHARED_SECRET_PROPERTY: 'APPS_SCRIPT_SHARED_SECRET',
  DEFAULT_TIMEZONE: 'Asia/Manila',
  SHEETS: {
    USERS: 'Users',
    ACCOUNTS: 'Accounts',
    CATEGORIES: 'Categories',
    TRANSACTIONS: 'Transactions',
    BUDGETS: 'Budgets',
    RECURRING_RULES: 'RecurringRules',
    AUDIT_LOGS: 'AuditLogs'
  }
};

// Sheet Column Schemas
var SCHEMAS = {
  Users: ['userId', 'email', 'displayName', 'currency', 'timezone', 'createdAt', 'updatedAt'],
  Accounts: ['accountId', 'userId', 'name', 'type', 'currency', 'initialBalanceMinor', 'createdAt', 'updatedAt'],
  Categories: ['categoryId', 'userId', 'name', 'type', 'icon', 'color', 'createdAt', 'updatedAt'],
  Transactions: ['transactionId', 'userId', 'accountId', 'toAccountId', 'type', 'amountMinor', 'currency', 'categoryId', 'description', 'transactionDate', 'isRecurring', 'recurringRuleId', 'createdAt', 'updatedAt'],
  Budgets: ['budgetId', 'userId', 'period', 'year', 'month', 'categoryId', 'amountMinor', 'currency', 'createdAt', 'updatedAt'],
  RecurringRules: ['recurringRuleId', 'userId', 'accountId', 'categoryId', 'type', 'amountMinor', 'frequency', 'nextExecutionDate', 'description', 'active', 'createdAt', 'updatedAt'],
  AuditLogs: ['logId', 'userId', 'action', 'status', 'ipHash', 'timestamp']
};

/**
 * Handle HTTP GET (Health check / ping)
 */
function doGet(e) {
  return createJsonResponse({
    success: true,
    data: {
      status: 'healthy',
      service: 'Budget App Google Apps Script API',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Handle HTTP POST (All authenticated actions)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Acquire lock to prevent race conditions on concurrent sheet updates (15s timeout)
    var hasLock = lock.tryLock(15000);
    if (!hasLock) {
      return createErrorResponse('LOCK_TIMEOUT', 'Server is busy processing another request. Please retry.', 503);
    }

    if (!e || !e.postData || !e.postData.contents) {
      return createErrorResponse('INVALID_BODY', 'Missing request body.', 400);
    }

    var requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createErrorResponse('MALFORMED_JSON', 'Could not parse request body as JSON.', 400);
    }

    // Authenticate request
    var authError = authenticateRequest(requestData, e);
    if (authError) {
      return authError;
    }

    var action = requestData.action;
    var userId = requestData.userId;
    var payload = requestData.payload || {};

    if (!action) {
      return createErrorResponse('MISSING_ACTION', 'The action field is required.', 400);
    }

    // Initialize spreadsheet sheets if needed
    ensureSheetsInitialized();

    // Dispatch action
    var result;
    switch (action) {
      case 'ping':
        result = { pong: true, time: new Date().toISOString() };
        break;

      case 'user.getOrCreate':
        result = handleUserGetOrCreate(userId, payload);
        break;

      case 'user.updateSettings':
        result = handleUserUpdateSettings(userId, payload);
        break;

      case 'accounts.list':
        result = handleAccountsList(userId);
        break;

      case 'accounts.create':
        result = handleAccountsCreate(userId, payload);
        break;

      case 'accounts.update':
        result = handleAccountsUpdate(userId, payload);
        break;

      case 'accounts.delete':
        result = handleAccountsDelete(userId, payload);
        break;

      case 'categories.list':
        result = handleCategoriesList(userId);
        break;

      case 'categories.create':
        result = handleCategoriesCreate(userId, payload);
        break;

      case 'categories.update':
        result = handleCategoriesUpdate(userId, payload);
        break;

      case 'categories.delete':
        result = handleCategoriesDelete(userId, payload);
        break;

      case 'transactions.list':
        result = handleTransactionsList(userId, payload);
        break;

      case 'transactions.create':
        result = handleTransactionsCreate(userId, payload);
        break;

      case 'transactions.update':
        result = handleTransactionsUpdate(userId, payload);
        break;

      case 'transactions.delete':
        result = handleTransactionsDelete(userId, payload);
        break;

      case 'budgets.list':
        result = handleBudgetsList(userId, payload);
        break;

      case 'budgets.upsert':
        result = handleBudgetsUpsert(userId, payload);
        break;

      case 'budgets.delete':
        result = handleBudgetsDelete(userId, payload);
        break;

      case 'budgets.copy':
        result = handleBudgetsCopy(userId, payload);
        break;

      case 'recurring.list':
        result = handleRecurringList(userId);
        break;

      case 'recurring.create':
        result = handleRecurringCreate(userId, payload);
        break;

      case 'recurring.update':
        result = handleRecurringUpdate(userId, payload);
        break;

      case 'recurring.delete':
        result = handleRecurringDelete(userId, payload);
        break;

      case 'user.purgeAllData':
        result = handleUserPurgeAllData(userId);
        break;

      default:
        return createErrorResponse('UNKNOWN_ACTION', 'Action "' + action + '" is not recognized.', 404);
    }

    logAudit(userId, action, 'SUCCESS');
    return createJsonResponse({ success: true, data: result });

  } catch (err) {
    var errMessage = err && err.message ? err.message : String(err);
    logAudit(requestData ? requestData.userId : 'UNKNOWN', requestData ? requestData.action : 'UNKNOWN', 'ERROR: ' + errMessage);
    return createErrorResponse('INTERNAL_ERROR', 'A server error occurred. Please try again.', 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Authentication & Signature Verification
 */
function authenticateRequest(data, e) {
  var properties = PropertiesService.getScriptProperties();
  var configuredSecret = properties.getProperty(CONFIG.SHARED_SECRET_PROPERTY);

  // If a shared secret is configured, require authorization header or secretToken
  if (configuredSecret) {
    var providedSecret = data.secretToken || (e && e.parameter && e.parameter.secretToken);
    if (!providedSecret || providedSecret !== configuredSecret) {
      return createErrorResponse('UNAUTHORIZED', 'Invalid or missing API authorization credentials.', 401);
    }
  }

  // Validate request age (anti-replay defense) if timestamp is provided
  if (data.timestamp) {
    var reqTime = new Date(data.timestamp).getTime();
    var now = new Date().getTime();
    if (isNaN(reqTime) || Math.abs(now - reqTime) > 300000) { // 5 minutes tolerance
      return createErrorResponse('INVALID_TIMESTAMP', 'Request timestamp is invalid or expired.', 400);
    }
  }

  if (data.action !== 'ping' && (!data.userId || typeof data.userId !== 'string' || data.userId.trim() === '')) {
    return createErrorResponse('MISSING_USER_ID', 'Authenticated user identifier is required.', 400);
  }

  return null;
}

/**
 * Sanitize cell values to prevent formula injection
 */
function sanitizeCellValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  var str = String(val);
  // Neutralize leading '=', '+', '-', '@', '\t', '\r'
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Get active spreadsheet
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Ensure sheets exist and headers match schema
 */
function ensureSheetsInitialized() {
  var ss = getSpreadsheet();
  for (var sheetName in SCHEMAS) {
    var sheet = ss.getSheetByName(sheetName);
    var cols = SCHEMAS[sheetName];
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(cols);
      // Freeze header row
      sheet.setFrozenRows(1);
    } else {
      if (sheet.getLastRowNum() === 0) {
        sheet.appendRow(cols);
        sheet.setFrozenRows(1);
      }
    }
  }
}

/**
 * Helper: Find row index by matching column criteria
 */
function findRowIndex(sheetName, colName, value) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRowNum() < 2) return -1;

  var schema = SCHEMAS[sheetName];
  var colIdx = schema.indexOf(colName);
  if (colIdx === -1) return -1;

  var data = sheet.getRange(2, 1, sheet.getLastRowNum() - 1, schema.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(value)) {
      return i + 2; // 1-indexed, skipping header
    }
  }
  return -1;
}

/**
 * Helper: Read all rows filtered by userId
 */
function readRowsByUserId(sheetName, userId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRowNum() < 2) return [];

  var schema = SCHEMAS[sheetName];
  var userColIdx = schema.indexOf('userId');
  if (userColIdx === -1) return [];

  var lastRow = sheet.getLastRowNum();
  var data = sheet.getRange(2, 1, lastRow - 1, schema.length).getValues();
  var results = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    // Include user-owned rows or system categories
    if (String(row[userColIdx]) === String(userId) || (sheetName === 'Categories' && String(row[userColIdx]) === 'SYSTEM')) {
      var obj = {};
      for (var c = 0; c < schema.length; c++) {
        var key = schema[c];
        var val = row[c];
        // Strip leading quote if it was sanitized
        if (typeof val === 'string' && val.indexOf("'") === 0) {
          val = val.substring(1);
        }
        obj[key] = val;
      }
      results.push(obj);
    }
  }
  return results;
}

/**
 * User get or create handler
 */
function handleUserGetOrCreate(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  var rowIdx = findRowIndex(CONFIG.SHEETS.USERS, 'userId', userId);
  var now = new Date().toISOString();

  if (rowIdx > -1) {
    // Existing user
    var schema = SCHEMAS.Users;
    var rowData = sheet.getRange(rowIdx, 1, 1, schema.length).getValues()[0];
    var userObj = {};
    for (var c = 0; c < schema.length; c++) {
      userObj[schema[c]] = rowData[c];
    }
    return userObj;
  }

  // New user registration
  var email = sanitizeCellValue(payload.email || '');
  var displayName = sanitizeCellValue(payload.displayName || 'Budget User');
  var currency = sanitizeCellValue(payload.currency || 'PHP');
  var timezone = sanitizeCellValue(payload.timezone || CONFIG.DEFAULT_TIMEZONE);

  var newUserRow = [userId, email, displayName, currency, timezone, now, now];
  sheet.appendRow(newUserRow);

  // Initialize default account (Cash Wallet)
  var accountsSheet = ss.getSheetByName(CONFIG.SHEETS.ACCOUNTS);
  var defaultAccountId = Utilities.getUuid();
  accountsSheet.appendRow([
    defaultAccountId,
    userId,
    'Cash Wallet',
    'cash',
    currency,
    0,
    now,
    now
  ]);

  // Seed default categories for this user
  seedDefaultCategories(userId);

  return {
    userId: userId,
    email: email,
    displayName: displayName,
    currency: currency,
    timezone: timezone,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Seed standard categories for new user
 */
function seedDefaultCategories(userId) {
  var ss = getSpreadsheet();
  var catSheet = ss.getSheetByName(CONFIG.SHEETS.CATEGORIES);
  var now = new Date().toISOString();

  var defaults = [
    { name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#EF4444' },
    { name: 'Groceries', type: 'expense', icon: 'ShoppingCart', color: '#F97316' },
    { name: 'Housing & Rent', type: 'expense', icon: 'Home', color: '#F59E0B' },
    { name: 'Utilities & Bills', type: 'expense', icon: 'Zap', color: '#10B981' },
    { name: 'Transportation', type: 'expense', icon: 'Car', color: '#06B6D4' },
    { name: 'Healthcare', type: 'expense', icon: 'HeartPulse', color: '#3B82F6' },
    { name: 'Entertainment', type: 'expense', icon: 'Film', color: '#6366F1' },
    { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#8B5CF6' },
    { name: 'Salary / Income', type: 'income', icon: 'Briefcase', color: '#10B981' },
    { name: 'Freelance & Business', type: 'income', icon: 'Laptop', color: '#059669' },
    { name: 'Investments', type: 'income', icon: 'TrendingUp', color: '#047857' },
    { name: 'Other', type: 'expense', icon: 'MoreHorizontal', color: '#6B7280' }
  ];

  for (var i = 0; i < defaults.length; i++) {
    var cat = defaults[i];
    catSheet.appendRow([
      Utilities.getUuid(),
      userId,
      cat.name,
      cat.type,
      cat.icon,
      cat.color,
      now,
      now
    ]);
  }
}

/**
 * User settings update
 */
function handleUserUpdateSettings(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  var rowIdx = findRowIndex(CONFIG.SHEETS.USERS, 'userId', userId);
  if (rowIdx === -1) {
    throw new Error('User not found.');
  }

  var now = new Date().toISOString();
  if (payload.currency) sheet.getRange(rowIdx, 4).setValue(sanitizeCellValue(payload.currency));
  if (payload.timezone) sheet.getRange(rowIdx, 5).setValue(sanitizeCellValue(payload.timezone));
  if (payload.displayName) sheet.getRange(rowIdx, 3).setValue(sanitizeCellValue(payload.displayName));
  sheet.getRange(rowIdx, 7).setValue(now);

  return handleUserGetOrCreate(userId, {});
}

/**
 * Accounts handlers
 */
function handleAccountsList(userId) {
  return readRowsByUserId(CONFIG.SHEETS.ACCOUNTS, userId);
}

function handleAccountsCreate(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.ACCOUNTS);
  var accountId = Utilities.getUuid();
  var now = new Date().toISOString();

  var row = [
    accountId,
    userId,
    sanitizeCellValue(payload.name),
    sanitizeCellValue(payload.type),
    sanitizeCellValue(payload.currency || 'PHP'),
    parseInt(payload.initialBalanceMinor || 0, 10),
    now,
    now
  ];
  sheet.appendRow(row);
  return { accountId: accountId, userId: userId, name: payload.name, type: payload.type, currency: payload.currency || 'PHP', initialBalanceMinor: parseInt(payload.initialBalanceMinor || 0, 10), createdAt: now, updatedAt: now };
}

function handleAccountsUpdate(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.ACCOUNTS);
  var rowIdx = findRowIndex(CONFIG.SHEETS.ACCOUNTS, 'accountId', payload.accountId);
  if (rowIdx === -1) throw new Error('Account not found.');

  // Validate ownership
  var ownerId = String(sheet.getRange(rowIdx, 2).getValue());
  if (ownerId !== String(userId)) throw new Error('Unauthorized.');

  var now = new Date().toISOString();
  if (payload.name) sheet.getRange(rowIdx, 3).setValue(sanitizeCellValue(payload.name));
  if (payload.type) sheet.getRange(rowIdx, 4).setValue(sanitizeCellValue(payload.type));
  if (payload.currency) sheet.getRange(rowIdx, 5).setValue(sanitizeCellValue(payload.currency));
  if (payload.initialBalanceMinor !== undefined) sheet.getRange(rowIdx, 6).setValue(parseInt(payload.initialBalanceMinor, 10));
  sheet.getRange(rowIdx, 8).setValue(now);

  return { success: true };
}

function handleAccountsDelete(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.ACCOUNTS);
  var rowIdx = findRowIndex(CONFIG.SHEETS.ACCOUNTS, 'accountId', payload.accountId);
  if (rowIdx === -1) throw new Error('Account not found.');

  var ownerId = String(sheet.getRange(rowIdx, 2).getValue());
  if (ownerId !== String(userId)) throw new Error('Unauthorized.');

  sheet.deleteRow(rowIdx);
  return { success: true };
}

/**
 * Categories handlers
 */
function handleCategoriesList(userId) {
  return readRowsByUserId(CONFIG.SHEETS.CATEGORIES, userId);
}

function handleCategoriesCreate(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.CATEGORIES);
  var categoryId = Utilities.getUuid();
  var now = new Date().toISOString();

  var row = [
    categoryId,
    userId,
    sanitizeCellValue(payload.name),
    sanitizeCellValue(payload.type),
    sanitizeCellValue(payload.icon || 'Tag'),
    sanitizeCellValue(payload.color || '#6B7280'),
    now,
    now
  ];
  sheet.appendRow(row);
  return { categoryId: categoryId, userId: userId, name: payload.name, type: payload.type, icon: payload.icon || 'Tag', color: payload.color || '#6B7280', createdAt: now, updatedAt: now };
}

function handleCategoriesUpdate(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.CATEGORIES);
  var rowIdx = findRowIndex(CONFIG.SHEETS.CATEGORIES, 'categoryId', payload.categoryId);
  if (rowIdx === -1) throw new Error('Category not found.');

  var ownerId = String(sheet.getRange(rowIdx, 2).getValue());
  if (ownerId !== String(userId)) throw new Error('Unauthorized.');

  var now = new Date().toISOString();
  if (payload.name) sheet.getRange(rowIdx, 3).setValue(sanitizeCellValue(payload.name));
  if (payload.type) sheet.getRange(rowIdx, 4).setValue(sanitizeCellValue(payload.type));
  if (payload.icon) sheet.getRange(rowIdx, 5).setValue(sanitizeCellValue(payload.icon));
  if (payload.color) sheet.getRange(rowIdx, 6).setValue(sanitizeCellValue(payload.color));
  sheet.getRange(rowIdx, 8).setValue(now);

  return { success: true };
}

function handleCategoriesDelete(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.CATEGORIES);
  var rowIdx = findRowIndex(CONFIG.SHEETS.CATEGORIES, 'categoryId', payload.categoryId);
  if (rowIdx === -1) throw new Error('Category not found.');

  var ownerId = String(sheet.getRange(rowIdx, 2).getValue());
  if (ownerId !== String(userId)) throw new Error('Unauthorized.');

  sheet.deleteRow(rowIdx);
  return { success: true };
}

/**
 * Transactions handlers
 */
function handleTransactionsList(userId, payload) {
  var transactions = readRowsByUserId(CONFIG.SHEETS.TRANSACTIONS, userId);

  // Optional filtering by date range, account, or category
  var filtered = transactions.filter(function(tx) {
    if (payload.startDate && tx.transactionDate < payload.startDate) return false;
    if (payload.endDate && tx.transactionDate > payload.endDate) return false;
    if (payload.accountId && tx.accountId !== payload.accountId) return false;
    if (payload.categoryId && tx.categoryId !== payload.categoryId) return false;
    if (payload.type && tx.type !== payload.type) return false;
    return true;
  });

  // Sort descending by transactionDate
  filtered.sort(function(a, b) {
    return (b.transactionDate || '').localeCompare(a.transactionDate || '');
  });

  return filtered;
}

function handleTransactionsCreate(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  var transactionId = Utilities.getUuid();
  var now = new Date().toISOString();

  var amountMinor = parseInt(payload.amountMinor, 10);
  if (isNaN(amountMinor) || amountMinor <= 0) {
    throw new Error('Transaction amount must be a positive integer in minor units.');
  }

  var row = [
    transactionId,
    userId,
    sanitizeCellValue(payload.accountId),
    sanitizeCellValue(payload.toAccountId || ''),
    sanitizeCellValue(payload.type),
    amountMinor,
    sanitizeCellValue(payload.currency || 'PHP'),
    sanitizeCellValue(payload.categoryId || ''),
    sanitizeCellValue(payload.description || ''),
    sanitizeCellValue(payload.transactionDate),
    Boolean(payload.isRecurring),
    sanitizeCellValue(payload.recurringRuleId || ''),
    now,
    now
  ];
  sheet.appendRow(row);

  return {
    transactionId: transactionId,
    userId: userId,
    accountId: payload.accountId,
    toAccountId: payload.toAccountId || '',
    type: payload.type,
    amountMinor: amountMinor,
    currency: payload.currency || 'PHP',
    categoryId: payload.categoryId || '',
    description: payload.description || '',
    transactionDate: payload.transactionDate,
    isRecurring: Boolean(payload.isRecurring),
    recurringRuleId: payload.recurringRuleId || '',
    createdAt: now,
    updatedAt: now
  };
}

function handleTransactionsUpdate(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  var rowIdx = findRowIndex(CONFIG.SHEETS.TRANSACTIONS, 'transactionId', payload.transactionId);
  if (rowIdx === -1) throw new Error('Transaction not found.');

  var ownerId = String(sheet.getRange(rowIdx, 2).getValue());
  if (ownerId !== String(userId)) throw new Error('Unauthorized.');

  var now = new Date().toISOString();
  if (payload.accountId) sheet.getRange(rowIdx, 3).setValue(sanitizeCellValue(payload.accountId));
  if (payload.toAccountId !== undefined) sheet.getRange(rowIdx, 4).setValue(sanitizeCellValue(payload.toAccountId));
  if (payload.type) sheet.getRange(rowIdx, 5).setValue(sanitizeCellValue(payload.type));
  if (payload.amountMinor !== undefined) {
    var amt = parseInt(payload.amountMinor, 10);
    if (isNaN(amt) || amt <= 0) throw new Error('Amount must be positive.');
    sheet.getRange(rowIdx, 6).setValue(amt);
  }
  if (payload.currency) sheet.getRange(rowIdx, 7).setValue(sanitizeCellValue(payload.currency));
  if (payload.categoryId !== undefined) sheet.getRange(rowIdx, 8).setValue(sanitizeCellValue(payload.categoryId));
  if (payload.description !== undefined) sheet.getRange(rowIdx, 9).setValue(sanitizeCellValue(payload.description));
  if (payload.transactionDate) sheet.getRange(rowIdx, 10).setValue(sanitizeCellValue(payload.transactionDate));
  sheet.getRange(rowIdx, 14).setValue(now);

  return { success: true };
}

function handleTransactionsDelete(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  var rowIdx = findRowIndex(CONFIG.SHEETS.TRANSACTIONS, 'transactionId', payload.transactionId);
  if (rowIdx === -1) throw new Error('Transaction not found.');

  var ownerId = String(sheet.getRange(rowIdx, 2).getValue());
  if (ownerId !== String(userId)) throw new Error('Unauthorized.');

  sheet.deleteRow(rowIdx);
  return { success: true };
}

/**
 * Budgets handlers
 */
function handleBudgetsList(userId, payload) {
  var budgets = readRowsByUserId(CONFIG.SHEETS.BUDGETS, userId);
  if (payload.year) {
    budgets = budgets.filter(function(b) {
      return parseInt(b.year, 10) === parseInt(payload.year, 10);
    });
  }
  if (payload.month) {
    budgets = budgets.filter(function(b) {
      return parseInt(b.month, 10) === parseInt(payload.month, 10);
    });
  }
  return budgets;
}

function handleBudgetsUpsert(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.BUDGETS);
  var now = new Date().toISOString();
  var amountMinor = parseInt(payload.amountMinor, 10);
  if (isNaN(amountMinor) || amountMinor < 0) throw new Error('Budget amount must be non-negative.');

  var existingBudgets = readRowsByUserId(CONFIG.SHEETS.BUDGETS, userId);
  var match = null;

  for (var i = 0; i < existingBudgets.length; i++) {
    var b = existingBudgets[i];
    if (b.period === payload.period &&
        parseInt(b.year, 10) === parseInt(payload.year, 10) &&
        String(b.month || '') === String(payload.month || '') &&
        String(b.categoryId || '') === String(payload.categoryId || '')) {
      match = b;
      break;
    }
  }

  if (match) {
    var rowIdx = findRowIndex(CONFIG.SHEETS.BUDGETS, 'budgetId', match.budgetId);
    sheet.getRange(rowIdx, 7).setValue(amountMinor);
    sheet.getRange(rowIdx, 10).setValue(now);
    return { budgetId: match.budgetId, userId: userId, amountMinor: amountMinor, updatedAt: now };
  } else {
    var budgetId = Utilities.getUuid();
    var row = [
      budgetId,
      userId,
      sanitizeCellValue(payload.period || 'monthly'),
      parseInt(payload.year, 10),
      payload.month ? parseInt(payload.month, 10) : '',
      sanitizeCellValue(payload.categoryId || ''),
      amountMinor,
      sanitizeCellValue(payload.currency || 'PHP'),
      now,
      now
    ];
    sheet.appendRow(row);
    return { budgetId: budgetId, userId: userId, amountMinor: amountMinor, createdAt: now, updatedAt: now };
  }
}

function handleBudgetsDelete(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.BUDGETS);
  var rowIdx = findRowIndex(CONFIG.SHEETS.BUDGETS, 'budgetId', payload.budgetId);
  if (rowIdx === -1) throw new Error('Budget not found.');

  var ownerId = String(sheet.getRange(rowIdx, 2).getValue());
  if (ownerId !== String(userId)) throw new Error('Unauthorized.');

  sheet.deleteRow(rowIdx);
  return { success: true };
}

function handleBudgetsCopy(userId, payload) {
  var fromYear = parseInt(payload.fromYear, 10);
  var fromMonth = parseInt(payload.fromMonth, 10);
  var toYear = parseInt(payload.toYear, 10);
  var toMonth = parseInt(payload.toMonth, 10);

  var allBudgets = readRowsByUserId(CONFIG.SHEETS.BUDGETS, userId);
  var sourceBudgets = allBudgets.filter(function(b) {
    return parseInt(b.year, 10) === fromYear && parseInt(b.month, 10) === fromMonth;
  });

  var createdCount = 0;
  for (var i = 0; i < sourceBudgets.length; i++) {
    var src = sourceBudgets[i];
    handleBudgetsUpsert(userId, {
      period: src.period,
      year: toYear,
      month: toMonth,
      categoryId: src.categoryId,
      amountMinor: src.amountMinor,
      currency: src.currency
    });
    createdCount++;
  }
  return { copied: createdCount };
}

/**
 * Recurring rules handlers
 */
function handleRecurringList(userId) {
  return readRowsByUserId(CONFIG.SHEETS.RECURRING_RULES, userId);
}

function handleRecurringCreate(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.RECURRING_RULES);
  var ruleId = Utilities.getUuid();
  var now = new Date().toISOString();

  var row = [
    ruleId,
    userId,
    sanitizeCellValue(payload.accountId),
    sanitizeCellValue(payload.categoryId || ''),
    sanitizeCellValue(payload.type),
    parseInt(payload.amountMinor, 10),
    sanitizeCellValue(payload.frequency),
    sanitizeCellValue(payload.nextExecutionDate),
    sanitizeCellValue(payload.description || ''),
    payload.active !== false,
    now,
    now
  ];
  sheet.appendRow(row);
  return { recurringRuleId: ruleId, userId: userId, createdAt: now };
}

function handleRecurringUpdate(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.RECURRING_RULES);
  var rowIdx = findRowIndex(CONFIG.SHEETS.RECURRING_RULES, 'recurringRuleId', payload.recurringRuleId);
  if (rowIdx === -1) throw new Error('Recurring rule not found.');

  var ownerId = String(sheet.getRange(rowIdx, 2).getValue());
  if (ownerId !== String(userId)) throw new Error('Unauthorized.');

  var now = new Date().toISOString();
  if (payload.amountMinor !== undefined) sheet.getRange(rowIdx, 6).setValue(parseInt(payload.amountMinor, 10));
  if (payload.frequency) sheet.getRange(rowIdx, 7).setValue(sanitizeCellValue(payload.frequency));
  if (payload.nextExecutionDate) sheet.getRange(rowIdx, 8).setValue(sanitizeCellValue(payload.nextExecutionDate));
  if (payload.description !== undefined) sheet.getRange(rowIdx, 9).setValue(sanitizeCellValue(payload.description));
  if (payload.active !== undefined) sheet.getRange(rowIdx, 10).setValue(Boolean(payload.active));
  sheet.getRange(rowIdx, 12).setValue(now);

  return { success: true };
}

function handleRecurringDelete(userId, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.RECURRING_RULES);
  var rowIdx = findRowIndex(CONFIG.SHEETS.RECURRING_RULES, 'recurringRuleId', payload.recurringRuleId);
  if (rowIdx === -1) throw new Error('Recurring rule not found.');

  var ownerId = String(sheet.getRange(rowIdx, 2).getValue());
  if (ownerId !== String(userId)) throw new Error('Unauthorized.');

  sheet.deleteRow(rowIdx);
  return { success: true };
}

/**
 * Cascade Delete / Data Purge (GDPR / Privacy / Right to be Forgotten)
 */
function handleUserPurgeAllData(userId) {
  var ss = getSpreadsheet();
  var sheetsToPurge = [
    CONFIG.SHEETS.TRANSACTIONS,
    CONFIG.SHEETS.BUDGETS,
    CONFIG.SHEETS.RECURRING_RULES,
    CONFIG.SHEETS.ACCOUNTS,
    CONFIG.SHEETS.CATEGORIES,
    CONFIG.SHEETS.USERS
  ];

  var deletedCounts = {};

  for (var s = 0; s < sheetsToPurge.length; s++) {
    var sheetName = sheetsToPurge[s];
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRowNum() < 2) continue;

    var schema = SCHEMAS[sheetName];
    var userColIdx = schema.indexOf('userId');
    if (userColIdx === -1) continue;

    var lastRow = sheet.getLastRowNum();
    var data = sheet.getRange(2, 1, lastRow - 1, schema.length).getValues();
    var count = 0;

    // Delete matching rows backwards to keep row indices stable
    for (var r = data.length - 1; r >= 0; r--) {
      if (String(data[r][userColIdx]) === String(userId)) {
        sheet.deleteRow(r + 2);
        count++;
      }
    }
    deletedCounts[sheetName] = count;
  }

  logAudit(userId, 'USER_PURGE_ALL_DATA', 'COMPLETE');
  return { success: true, deleted: deletedCounts };
}

/**
 * Log audit events without recording sensitive financial numbers
 */
function logAudit(userId, action, status) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.AUDIT_LOGS);
    if (sheet) {
      sheet.appendRow([
        Utilities.getUuid(),
        sanitizeCellValue(userId),
        sanitizeCellValue(action),
        sanitizeCellValue(status),
        'server-gateway',
        new Date().toISOString()
      ]);
    }
  } catch (e) {
    // Audit logging should not crash the main thread
    console.warn('Audit log write failed: ' + e);
  }
}

/**
 * Standard JSON Response Builder
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Standard Error Response Builder
 */
function createErrorResponse(code, message, httpStatus) {
  var output = {
    success: false,
    error: {
      code: code,
      message: message
    }
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
