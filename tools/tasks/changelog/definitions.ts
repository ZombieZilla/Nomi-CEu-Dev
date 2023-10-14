import { Category, Commit, Parser, SubCategory } from "../../types/changelogTypes";
import { modpackManifest } from "../../globals";
import { parseCommitBody } from "./parser";
import { parseFixUp } from "./specialParser";

/* Values */
export const defaultIndentation = "";
export const indentationLevel = "  ";

/* Keys */

/* Special Handling Keys */
export const skipKey = "[SKIP]";
export const expandKey = "[EXPAND]";
export const expandList = "messages";
export const detailsKey = "[DETAILS]";
export const detailsList = "details";
export const noCategoryKey = "[NO CATEGORY]";
export const fixUpKey = "[FIXUP]";
export const fixUpList = "fixes";

/* Sub Category Keys */
// Mode Category Keys
const normalMode: SubCategory = { commitKey: "[NM]", keyName: "Normal Mode" };
const hardMode: SubCategory = { commitKey: "[HM]", keyName: "Hard Mode" };

/* Misc Sub Category Keys */
const qolChanges: SubCategory = { commitKey: "[QOL]", keyName: "Quality of Life" };

/* Set Sub Categories (Sub Categories that do not let any commit in) */
const bothModes: SubCategory = { keyName: "Both Modes" };
const modUpdates: SubCategory = { keyName: "Mod Updates" };
const modAdditions: SubCategory = { keyName: "Mod Additions" };
const modRemovals: SubCategory = { keyName: "Mod Removals" };

/* Default Sub Categories (Sub Categories that allow any commit in) */
const emptySubCategory: SubCategory = { commitKey: "", keyName: "" };
const other: SubCategory = { commitKey: "", keyName: "Other" };

/* Category Keys: */
const breakingCategory: Category = {
	commitKey: "[BREAKING]",
	categoryName: "Breaking Changes",
	defaultSubCategory: emptySubCategory,
	subCategories: [emptySubCategory],
};
const balancingCategory: Category = {
	commitKey: "[BALANCING]",
	categoryName: "Balancing Changes",
	defaultSubCategory: bothModes,
	subCategories: [bothModes, normalMode, hardMode],
};
const performanceCategory: Category = {
	commitKey: "[PERFORMANCE]",
	categoryName: "Performance Improvements",
	defaultSubCategory: emptySubCategory,
	subCategories: [emptySubCategory],
};
const featureCategory: Category = {
	commitKey: "[FEATURE]",
	categoryName: "Feature Additions",
	defaultSubCategory: bothModes,
	subCategories: [qolChanges, bothModes, normalMode, hardMode],
};
const questBookCategory: Category = {
	commitKey: "[QB]",
	categoryName: "Quest Book Changes",
	defaultSubCategory: bothModes,
	subCategories: [bothModes, normalMode, hardMode],
};
const bugCategory: Category = {
	commitKey: "[BUG]",
	categoryName: "Bug Fixes",
	defaultSubCategory: bothModes,
	subCategories: [bothModes, normalMode, hardMode],
};
const generalCategory: Category = {
	commitKey: "[GENERAL]",
	categoryName: "General Changes",
	defaultSubCategory: other,
	subCategories: [modUpdates, modAdditions, modRemovals, other],
};
const internalCategory: Category = {
	commitKey: "[INTERNAL]",
	categoryName: "Internal Changes",
	defaultSubCategory: emptySubCategory,
	subCategories: [emptySubCategory],
};

/**
 * Category List
 * <p>
 * The order that the categories appear here will be the order that they appear in the changelog, and their priority.
 */
export const categories: Category[] = [
	breakingCategory,
	balancingCategory,
	performanceCategory,
	featureCategory,
	questBookCategory,
	bugCategory,
	generalCategory,
	internalCategory,
];

/* Parsing Util Methods */
const defaultSkipCallback = (_commit: Commit, _commitMessage: string, commitBody: string): boolean => {
	if (!commitBody) return false;
	return commitBody.includes(skipKey);
};
const defaultParsingCallback = async (
	parser: Parser,
	commit: Commit,
	commitMessage: string,
	commitBody: string,
): Promise<boolean> => {
	if (!commitBody) return false;
	return parseCommitBody(commitMessage, commitBody, commit, parser);
};

/* Parsing Categories */

const fixupParsing: Parser = {
	reverse: true,
	skipCallback: () => false,
	// No need to care about message/body, never parse expand/details commits
	itemCallback: (_parser, commit) => parseFixUp(commit),
	addCommitListCallback: () => false,
	addSHACallback: () => false,
};

const overridesParsing: Parser = {
	dirs: [modpackManifest.overrides],
	skipCallback: defaultSkipCallback,
	itemCallback: defaultParsingCallback,
	leftOverCallback: (commit, commitMessage, _commitBody, subMessages) => {
		generalCategory.changelogSection.get(generalCategory.defaultSubCategory).push({
			commitMessage: commitMessage,
			commitObjects: [commit],
			subChangelogMessages: subMessages,
		});
	},
	addCommitListCallback: () => true,
};

const manifestParsing: Parser = {
	dirs: ["manifest.json"],
	skipCallback: defaultSkipCallback,
	itemCallback: defaultParsingCallback,
	addCommitListCallback: () => true,
};

const finalParsing: Parser = {
	skipCallback: defaultSkipCallback,
	itemCallback: defaultParsingCallback,
	addCommitListCallback: (_commit, parsed) => parsed,
};

/**
 * Parsers
 * <p>
 * The order that the categories appear here will be the order that they are parsed in.<p>
 * Note that unless `addSHA` of the category is set to false, a commit parsed in a previous category will not be allowed to be parsed in future categories,
 * even if they fit in the dirs.
 */
export const parsers: Parser[] = [fixupParsing, overridesParsing, manifestParsing, finalParsing];

/* Parsing Information / Allocations for Mod Changes */

export type ModChangesType = "added" | "removed" | "updated";

/**
 * An Allocation for mod changes categories to grab from.
 */
export interface ModChangesAllocation {
	/**
	 * Category to put in.
	 */
	category: Category;

	/**
	 * Sub category of the category to put in.
	 */
	subCategory: SubCategory;

	/**
	 * The template to use.<p><p>
	 * Keys:<p>
	 * `{{{ modName }}}` replaced by mod name,<p>
	 * `{{{ oldVersion }}}` replaced by the old version (if applicable)<p>
	 * `{{{ newVersion }}}` replaced by the new version (if applicable)
	 */
	template: string;
}

export const modChangesAllocations: Record<ModChangesType, ModChangesAllocation> = {
	added: {
		category: generalCategory,
		subCategory: modAdditions,
		template: "{{ modName }}: *v{{ newVersion }}*",
	},
	updated: {
		category: generalCategory,
		subCategory: modUpdates,
		template: "{{ modName }}: *v{{ oldVersion }} ⇥ v{{ newVersion }}*",
	},
	removed: {
		category: generalCategory,
		subCategory: modRemovals,
		template: "{{ modName }}: *v{{ oldVersion }}*",
	},
};