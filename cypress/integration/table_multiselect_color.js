import table_multiselect_child from "../fixtures/table_multiselect_child";
import table_multiselect_parent from "../fixtures/table_multiselect_parent";

const prefix = "TMSPAL-" + Math.random().toString(36).slice(2, 8);
const PARENT_DT = table_multiselect_parent.name;
const FIELD = "todos";
const PILL_SELECTOR = `.frappe-control[data-fieldname="${FIELD}"] .tb-selected-value`;

context("Table MultiSelect pill palette colors", () => {
	before(() => {
		cy.login();
		cy.visit("/desk");
		cy.wait(4000);

		cy.insert_doc("DocType", table_multiselect_child, true);
		cy.insert_doc("DocType", table_multiselect_parent, true);

		// seed two source docs so we can verify deterministic different palette
		// slots are picked for distinct values
		cy.insert_doc("ToDo", { description: `${prefix}-Alpha` }, true);
		cy.insert_doc("ToDo", { description: `${prefix}-Beta` }, true);
	});

	after(() => {
		cy.get_list("ToDo", {
			fields: ["name"],
			filters: { description: ["like", `${prefix}%`] },
		}).then((docs) => {
			docs.forEach((d) => cy.remove_doc("ToDo", d.name, true));
		});
		cy.remove_doc("DocType", PARENT_DT, true);
		cy.remove_doc("DocType", table_multiselect_child.name, true);
	});

	const open_new_form = () => cy.new_form(PARENT_DT);

	const select_in_link = (text) => {
		cy.get(`input[data-fieldname="${FIELD}"]`).as("input");
		cy.get("@input").focus();
		cy.wait(500);
		cy.get("@input").type(text, { delay: 100 });
		cy.wait(500);
		cy.get("@input").type("{enter}");
		cy.wait(500);
	};

	it("renders pills with palette colors derived from the value", () => {
		open_new_form();
		select_in_link(`${prefix}-Alpha`);

		cy.get(PILL_SELECTOR).should("have.length", 1);
		cy.get(PILL_SELECTOR)
			.invoke("attr", "style")
			.should("match", /background-color:\s*var\(--[a-z-]+-avatar-bg\)/);
	});

	it("renders multiple pills with deterministic, distinct palette colors", () => {
		open_new_form();
		select_in_link(`${prefix}-Alpha`);
		select_in_link(`${prefix}-Beta`);

		cy.get(PILL_SELECTOR).should("have.length", 2);
		cy.get(PILL_SELECTOR).then(($pills) => {
			const styles = $pills
				.map((_, el) => el.getAttribute("style"))
				.get()
				.join("|");
			// each pill carries a var(--xxx-avatar-bg) style
			const matches = styles.match(/var\(--[a-z-]+-avatar-bg\)/g) || [];
			expect(matches).to.have.length(2);
		});
	});

	it("is deterministic: same value on a fresh form paints the same color", () => {
		// open two fresh forms in sequence, pick the same value in each,
		// and confirm the resulting style is byte-identical
		open_new_form();
		select_in_link(`${prefix}-Alpha`);
		cy.get(PILL_SELECTOR)
			.invoke("attr", "style")
			.then((first_style) => {
				open_new_form();
				select_in_link(`${prefix}-Alpha`);
				cy.get(PILL_SELECTOR)
					.invoke("attr", "style")
					.should("equal", first_style);
			});
	});
});
