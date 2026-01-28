import {
	CategoryTreeResDtoSchema,
	TCategoryTreeResDto,
} from "@/modules/category/dto/res";

interface CategoryDoc {
	id: string;
	name: string;
	parentId: string | null;
}

interface TreeNode {
	id: string;
	label: string;
	children: { id: string; label: string }[];
}

export function transformCategoryTree(
	categories: CategoryDoc[],
): TCategoryTreeResDto[] {
	const parents = new Map<string, TreeNode>();
	const children: { id: string; label: string; parentId: string }[] = [];

	// Separate parents and children
	categories.forEach((category) => {
		if (category.parentId === null) {
			parents.set(category.id, {
				id: category.id,
				label: category.name,
				children: [],
			});
		} else {
			children.push({
				id: category.id,
				label: category.name,
				parentId: category.parentId,
			});
		}
	});

	// Attach children to their parents
	children.forEach((child) => {
		const parent = parents.get(child.parentId);
		if (parent) {
			parent.children.push({
				id: child.id,
				label: child.label,
			});
		}
	});

	// Convert to array and validate
	return Array.from(parents.values()).map((parent) =>
		CategoryTreeResDtoSchema.parse(parent),
	);
}
