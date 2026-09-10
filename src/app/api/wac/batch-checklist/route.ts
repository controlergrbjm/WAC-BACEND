import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/authMiddleware';
import prisma from '../../../../../prisma/db';
import { z } from 'zod';

const schema = z.object({
  sessionId: z.string().uuid(),
  checklist: z.array(z.object({
    itemId: z.string(),
    itemName: z.string(),
    category: z.string(),
    targetSide: z.string(),
    isPassed: z.boolean(),
    note: z.string().nullable().optional(),
  })),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (authReq) => {
    try {
      const body = await authReq.json();
      const { sessionId, checklist } = schema.parse(body);

      if (checklist.length === 0) {
        return NextResponse.json({ success: true, message: '0 checklist items saved.' }, { status: 201 });
      }

      const uniqueCategoryNames = [...new Set(checklist.map(c => c.category))];

      // ── STEP 1: Fetch all existing categories in ONE query ──
      const existingCats = await prisma.master_categories.findMany({
        where: { name: { in: uniqueCategoryNames } },
        select: { id: true, name: true },
      });

      const categoryMap = new Map<string, string>(existingCats.map(c => [c.name, c.id]));

      // Create only missing categories (also in bulk)
      const missingCatNames = uniqueCategoryNames.filter(n => !categoryMap.has(n));
      if (missingCatNames.length > 0) {
        await prisma.master_categories.createMany({
          data: missingCatNames.map(name => ({ name })),
          skipDuplicates: true,
        });
        const newCats = await prisma.master_categories.findMany({
          where: { name: { in: missingCatNames } },
          select: { id: true, name: true },
        });
        newCats.forEach(c => categoryMap.set(c.name, c.id));
      }

      // ── STEP 2: Fetch all existing check items in ONE query ──
      const allCategoryIds = [...categoryMap.values()];
      const uniqueItemNames = [...new Set(checklist.map(c => c.itemName))];

      const existingItems = await prisma.master_check_items.findMany({
        where: {
          category_id: { in: allCategoryIds },
          name: { in: uniqueItemNames },
        },
        select: { id: true, name: true, category_id: true },
      });

      const checkItemMap = new Map<string, string>();
      existingItems.forEach(i => checkItemMap.set(`${i.category_id}_${i.name}`, i.id));

      // Create only missing check items (in bulk)
      const missingItems = checklist.filter(item => {
        const catId = categoryMap.get(item.category)!;
        return !checkItemMap.has(`${catId}_${item.itemName}`);
      });

      // Deduplicate missing items
      const seenKeys = new Set<string>();
      const uniqueMissingItems = missingItems.filter(item => {
        const catId = categoryMap.get(item.category)!;
        const key = `${catId}_${item.itemName}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      if (uniqueMissingItems.length > 0) {
        await prisma.master_check_items.createMany({
          data: uniqueMissingItems.map(item => ({
            category_id: categoryMap.get(item.category)!,
            name: item.itemName,
            description: item.targetSide,
          })),
          skipDuplicates: true,
        });
        const newItems = await prisma.master_check_items.findMany({
          where: {
            category_id: { in: allCategoryIds },
            name: { in: uniqueMissingItems.map(i => i.itemName) },
          },
          select: { id: true, name: true, category_id: true },
        });
        newItems.forEach(i => checkItemMap.set(`${i.category_id}_${i.name}`, i.id));
      }

      // ── STEP 3: Delete old + Bulk insert new details in 2 queries ──
      await prisma.wac_details.deleteMany({ where: { session_id: sessionId } });

      const detailsData = checklist.map(item => ({
        session_id: sessionId,
        check_item_id: checkItemMap.get(`${categoryMap.get(item.category)!}_${item.itemName}`)!,
        status: (item.isPassed ? 'OK' : 'NG') as import('@prisma/client').ItemStatus,
        note: item.note ?? null,
      }));

      await prisma.wac_details.createMany({ data: detailsData, skipDuplicates: true });

      return NextResponse.json({
        success: true,
        message: `${detailsData.length} checklist items saved.`,
      }, { status: 201 });

    } catch (error: any) {
      console.error('batch-checklist error:', error);
      return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
    }
  });
}
