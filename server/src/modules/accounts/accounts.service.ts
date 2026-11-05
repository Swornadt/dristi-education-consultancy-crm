import { AppError } from "../../common/errors/AppError";
import { JwtPayload } from "../../types/auth";
import * as queries from "./accounts.queries";

const mapCategory = (row: any) => ({
  id: Number(row.id),
  name: row.name as string,
  kind: row.kind as "income" | "expense",
  isActive: row.is_active as boolean,
});

const mapEntry = (row: any) => ({
  id: Number(row.id),
  category: {
    id: Number(row.category_id),
    name: row.category_name as string,
    kind: row.kind as "income" | "expense",
  },
  entryDate: row.entry_date as string,
  amount: Number(row.amount),
  description: row.description as string | null,
  payeeName: row.payee_name as string | null,
  periodMonth: row.period_month as string | null,
  referenceNo: row.reference_no as string | null,
  createdBy: {
    id: Number(row.created_by),
    fullName: row.created_by_name as string,
  },
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

export async function listCategories() {
  const rows = await queries.listCategories();
  return rows.map(mapCategory);
}

export async function createCategory(data: {
  name: string;
  kind: "income" | "expense";
}) {
  const existing = await queries.getCategoryByName(data.name);
  if (existing)
    throw new AppError(
      "CONFLICT",
      `A category named "${data.name}" already exists`,
      409,
    );

  const id = await queries.createCategory(data.name, data.kind);
  const row = await queries.getCategoryById(id);
  return mapCategory(row);
}

export async function updateCategory(
  id: number,
  data: { name?: string; isActive?: boolean },
) {
  const existing = await queries.getCategoryById(id);
  if (!existing) throw new AppError("NOT_FOUND", "Category not found", 404);

  if (data.name) {
    const dup = await queries.getCategoryByName(data.name);
    if (dup && Number(dup.id) !== id) {
      throw new AppError(
        "CONFLICT",
        `A category named "${data.name}" already exists`,
        409,
      );
    }
  }

  await queries.updateCategory(id, data);
  return mapCategory(await queries.getCategoryById(id));
}

export async function listEntries(filters: queries.EntryFilters) {
  try {
    const { rows, total, page, limit } = await queries.listEntries(filters);
    return {
      data: rows.map(mapEntry),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  } catch (err: any) {
    if (err.code === "22P02" || err.code === "22007") {
      throw new AppError("VALIDATION_ERROR", "Invalid filter value provided", 400);
    }
    throw err;
  }
}

export async function getEntry(id: number) {
  const row = await queries.getEntryById(id);
  if (!row) throw new AppError("NOT_FOUND", "Entry not found", 404);
  return mapEntry(row);
}

export async function createEntry(user: JwtPayload, data: {
  categoryId: number;
  entryDate: string;
  amount: number;
  description?: string;
  payeeName?: string;
  periodMonth?: string;
  referenceNo?: string;
}) {
  const cat = await queries.getCategoryById(data.categoryId);
  if (!cat) throw new AppError("VALIDATION_ERROR", "Category not found", 400);
  if (!cat.is_active)
    throw new AppError("VALIDATION_ERROR", "Category is inactive", 400);

  try {
    const id = await queries.createEntry({
      ...data,
      createdBy: user.id,
    });
    return getEntry(id);
  } catch (err: any) {
    if (err.code === "23514") {
      throw new AppError(
        "VALIDATION_ERROR",
        "periodMonth must be the first day of the month (YYYY-MM-01)",
        400,
      );
    }
    if (err.code === "23503") {
      throw new AppError("VALIDATION_ERROR", "Category not found", 400);
    }
    if (err.code === "22003") {
      throw new AppError(
        "VALIDATION_ERROR",
        "amount is too large (max 9999999999.99)",
        400,
      );
    }
    throw err;
  }
}

export async function updateEntry(
  id: number,
  data: {
    categoryId?: number;
    entryDate?: string;
    amount?: number;
    description?: string;
    payeeName?: string;
    periodMonth?: string;
    referenceNo?: string;
  },
) {
  await getEntry(id);

  if (data.categoryId !== undefined) {
    const cat = await queries.getCategoryById(data.categoryId);
    if (!cat) throw new AppError("VALIDATION_ERROR", "Category not found", 400);
    if (!cat.is_active)
      throw new AppError("VALIDATION_ERROR", "Category is inactive", 400);
  }

  try {
    await queries.updateEntry(id, data);
    return getEntry(id);
  } catch (err: any) {
    if (err.code === "23514") {
      throw new AppError(
        "VALIDATION_ERROR",
        "periodMonth must be the first day of the month (YYYY-MM-01)",
        400,
      );
    }
    if (err.code === "23503") {
      throw new AppError("VALIDATION_ERROR", "Category not found", 400);
    }
    if (err.code === "22003") {
      throw new AppError(
        "VALIDATION_ERROR",
        "amount is too large (max 9999999999.99)",
        400,
      );
    }
    throw err;
  }
}

export async function deleteEntry(id: number) {
  await getEntry(id);
  await queries.deleteEntry(id);
}

export async function getSummary(month?: string) {
  const target = month ?? new Date().toISOString().slice(0, 7);
  const monthStart = `${target}-01`;

  const rows = await queries.getSummary(monthStart);

  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory = rows.map((r: any) => {
    const total = Number(r.total);
    if (r.kind === "income") totalIncome += total;
    if (r.kind === "expense") totalExpense += total;
    return {
      categoryId: Number(r.category_id),
      name: r.category_name as string,
      kind: r.kind as "income" | "expense",
      total,
    };
  });

  return {
    month: target,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    byCategory,
  };
}