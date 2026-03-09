
function login() {
	const username = document.getElementById("username")?.value?.trim();
	const password = document.getElementById("password")?.value;

	if (username === "admin" && password === "admin123") {
		localStorage.setItem("loggedIn", "true");
		window.location.href = "dashboard.html";
		return;
	}

	alert("Invalid credential");
}

const API = "https://phi-lab-server.vercel.app/api/v1/lab/issues";
const ISSUE_API = "https://phi-lab-server.vercel.app/api/v1/lab/issue";
function setActiveTab(type) {
	const tabs = ["all", "open", "closed"];
	tabs.forEach((tab) => {
		const tabNode = document.getElementById(`${tab}Tab`);
		if (tabNode) {
			tabNode.classList.toggle("active", tab === type);
		}
	});
}

function getActiveTabType() {
	const tabs = ["all", "open", "closed"];
	const activeTab = tabs.find((tab) => document.getElementById(`${tab}Tab`)?.classList.contains("active"));
	return activeTab || "all";
}

function updateStats(allIssues, activeType = "all") {
	const all = allIssues.length;
	const open = allIssues.filter((issue) => issue.status === "open").length;
	const closed = allIssues.filter((issue) => issue.status === "closed").length;
	const activeCount = activeType === "open" ? open : activeType === "closed" ? closed : all;

	const statAll = document.getElementById("statAll");
	const statOpen = document.getElementById("statOpen");
	const statClosed = document.getElementById("statClosed");
	const summaryTotal = document.getElementById("summaryTotal");
	const summaryOpen = document.getElementById("summaryOpen");
	const summaryClosed = document.getElementById("summaryClosed");

	if (statAll) statAll.innerText = all;
	if (statOpen) statOpen.innerText = open;
	if (statClosed) statClosed.innerText = closed;
	if (summaryTotal) summaryTotal.innerText = `${activeCount} Issues`;
	if (summaryOpen) summaryOpen.innerText = "Open";
	if (summaryClosed) summaryClosed.innerText = "Closed";
}

function setIssuesLoading(isLoading) {
	const loader = document.getElementById("loader");
	const container = document.getElementById("issueContainer");
	const emptyState = document.getElementById("emptyState");
	const statAll = document.getElementById("statAll");
	const statOpen = document.getElementById("statOpen");
	const statClosed = document.getElementById("statClosed");
	const summaryTotal = document.getElementById("summaryTotal");
	const summaryOpen = document.getElementById("summaryOpen");
	const summaryClosed = document.getElementById("summaryClosed");

	if (loader) loader.style.display = isLoading ? "flex" : "none";
	if (container) container.style.display = isLoading ? "none" : "grid";
	if (isLoading && emptyState) emptyState.style.display = "none";

	if (isLoading) {
		if (statAll) statAll.innerText = "0";
		if (statOpen) statOpen.innerText = "0";
		if (statClosed) statClosed.innerText = "0";
		if (summaryTotal) summaryTotal.innerText = "0 Issues";
		if (summaryOpen) summaryOpen.innerText = "Open";
		if (summaryClosed) summaryClosed.innerText = "Closed";
	}
}

async function loadIssues(type = "all") {
	setIssuesLoading(true);

	try {
		const res = await fetch(API);
		const data = await res.json();

		const allIssues = data.data || [];
		updateStats(allIssues, type);

		let issues = allIssues;
		if (type === "open") issues = allIssues.filter((issue) => issue.status === "open");
		if (type === "closed") issues = allIssues.filter((issue) => issue.status === "closed");

		setActiveTab(type);
		displayIssues(issues);
	} catch (error) {
		console.error(error);
		displayIssues([]);
	} finally {
		setIssuesLoading(false);
	}
}

function displayIssues(issues) {
	const container = document.getElementById("issueContainer");
	const emptyState = document.getElementById("emptyState");
	if (!container) return;

	container.innerHTML = "";
	if (!issues?.length) {
		if (emptyState) emptyState.style.display = "block";
		return;
	}

	if (emptyState) emptyState.style.display = "none";

	issues.forEach((issue) => {
		const card = document.createElement("article");
		const statusText = String(issue.status || "unknown").toLowerCase();
		const tags = normalizeIssueTags(issue).slice(0, 2);
		const createdText = formatIssueDate(issue.createdAt);
		const authorText = issue.author || "Unknown";
		const authorHandle = String(authorText).toLowerCase().replace(/\s+/g, "_");
		const issueRef = issue.issueNo || issue.number || (issue._id ? issue._id.slice(-4) : "1");
		const priorityText = String(issue.priority || "n/a").toUpperCase();
		const hasAlertTag = tags.some((tag) => /bug|critical|error/i.test(tag));
		const priorityClass = /high/i.test(priorityText)
			? "high"
			: /medium/i.test(priorityText)
				? "medium"
				: /low/i.test(priorityText)
					? "low"
					: "";

		card.className = `issue-card ${statusText}`;
		card.innerHTML = `
			<div class="issue-head-row">
				<span class="card-status-dot ${statusText}" aria-hidden="true"></span>
				<span class="card-priority-pill ${priorityClass}">${priorityText}</span>
			</div>
			<h3>${issue.title || "Untitled"}</h3>
			<p class="issue-desc">${issue.description || "No description provided."}</p>
			<div class="issue-tags-row">
				${tags
					.map(
						(tag) => {
							const tagClass = getTagVariantClass(tag, hasAlertTag);
							return `<span class="issue-tag ${tagClass}">${String(tag).toUpperCase()}</span>`;
						}
					)
					.join("") || '<span class="issue-tag neutral">GENERAL</span>'}
			</div>
			<div class="issue-footer">
				<p class="issue-id-line">#${issueRef} by ${authorHandle}</p>
				<p class="issue-date-line">${createdText}</p>
			</div>
		`;

		card.onclick = () => openModal(issue);
		container.appendChild(card);
	});
}

function formatIssueKey(key) {
	return key
		.replace(/_/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatIssueValue(value) {
	if (value === null || value === undefined || value === "") return "n/a";
	if (typeof value === "object") {
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}
	return String(value);
}

function formatIssueDate(dateInput) {
	if (!dateInput) return "n/a";
	const parsed = new Date(dateInput);
	if (Number.isNaN(parsed.getTime())) return String(dateInput);

	const day = String(parsed.getDate()).padStart(2, "0");
	const month = String(parsed.getMonth() + 1).padStart(2, "0");
	const year = parsed.getFullYear();
	return `${day}/${month}/${year}`;
}

function normalizeIssueTags(issue) {
	const rawTags = [];
	if (Array.isArray(issue?.tags)) rawTags.push(...issue.tags);
	if (typeof issue?.tags === "string") rawTags.push(...issue.tags.split(/[,|]/));
	if (Array.isArray(issue?.labels)) rawTags.push(...issue.labels);
	if (typeof issue?.label === "string") rawTags.push(...issue.label.split(/[,|]/));
	if (typeof issue?.type === "string") rawTags.push(issue.type);

	return [...new Set(rawTags.map((tag) => String(tag).trim()).filter(Boolean))];
}

function getTagVariantClass(tag, hasAlertTag = false) {
	if (/bug/i.test(String(tag))) return "bug";
	if (/help[\s_-]*wanted/i.test(String(tag))) return "help-wanted";
	if (/enhancement/i.test(String(tag))) return "enhancement";
	if (hasAlertTag || /bug|critical|error/i.test(String(tag))) return "";
	return "neutral";
}

function setPriorityBadge(priorityBadge, priorityText) {
	if (!priorityBadge) return;
	const priority = String(priorityText || "n/a").toLowerCase();
	priorityBadge.className = "priority-pill";
	priorityBadge.innerText = priority.toUpperCase();
	if (priority.includes("high")) priorityBadge.classList.add("high");
	else if (priority.includes("medium")) priorityBadge.classList.add("medium");
	else if (priority.includes("low")) priorityBadge.classList.add("low");
}

function renderModalIssue(issue) {
	const modalTitle = document.getElementById("modalTitle");
	const modalDescription = document.getElementById("modalDescription");
	const modalStatePill = document.getElementById("modalStatePill");
	const modalMetaText = document.getElementById("modalMetaText");
	const modalTags = document.getElementById("modalTags");
	const modalAssignee = document.getElementById("modalAssignee");
	const modalPriorityBadge = document.getElementById("modalPriorityBadge");
	const modalDetails = document.getElementById("modalDetails");
	if (
		!modalTitle ||
		!modalDescription ||
		!modalStatePill ||
		!modalMetaText ||
		!modalTags ||
		!modalAssignee ||
		!modalPriorityBadge ||
		!modalDetails
	)
		return;

	modalTitle.innerText = issue?.title || "Untitled Issue";
	modalDescription.innerText = issue?.description || "No description provided.";

	const statusText = String(issue?.status || "unknown").toLowerCase();
	modalStatePill.className = "modal-state-pill";
	if (statusText === "open") {
		modalStatePill.classList.add("open");
		modalStatePill.innerText = "Opened";
	} else if (statusText === "closed") {
		modalStatePill.classList.add("closed");
		modalStatePill.innerText = "Closed";
	} else {
		modalStatePill.classList.add("unknown");
		modalStatePill.innerText = "Unknown";
	}

	const authorText = issue?.author || "Unknown author";
	const createdText = formatIssueDate(issue?.createdAt);
	modalMetaText.innerText = `Opened by ${authorText} • ${createdText}`;

	modalTags.innerHTML = "";
	const tags = normalizeIssueTags(issue);
	tags.forEach((tag) => {
		const tagEl = document.createElement("span");
		tagEl.className = "modal-tag";
		const tagClass = getTagVariantClass(tag);
		if (tagClass) tagEl.classList.add(tagClass);
		tagEl.innerText = tag;
		modalTags.appendChild(tagEl);
	});

	if (!tags.length) {
		const fallbackTag = document.createElement("span");
		fallbackTag.className = "modal-tag neutral";
		fallbackTag.innerText = "General";
		modalTags.appendChild(fallbackTag);
	}

	modalAssignee.innerText = issue?.assignee || issue?.author || "Unassigned";
	setPriorityBadge(modalPriorityBadge, issue?.priority || "n/a");

	modalDetails.innerHTML = "";

	const hiddenKeys = new Set([
		"title",
		"description",
		"status",
		"author",
		"assignee",
		"priority",
		"label",
		"labels",
		"tags",
		"type",
		"createdAt",
		"updatedAt",
		"_id",
		"id",
		"__v",
	]);

	const detailEntries = Object.entries(issue || {}).filter(
		([key]) => !hiddenKeys.has(key)
	);

	if (!detailEntries.length) {
		modalDetails.style.display = "none";
		return;
	}

	modalDetails.style.display = "grid";

	detailEntries.forEach(([key, value]) => {
		const row = document.createElement("p");
		row.className = "detail-row";

		const rowKey = document.createElement("strong");
		rowKey.innerText = `${formatIssueKey(key)}: `;
		const rowValue = document.createTextNode(formatIssueValue(value));

		row.appendChild(rowKey);
		row.appendChild(rowValue);
		modalDetails.appendChild(row);
	});
}

async function openModal(issuePreview) {
	const modal = document.getElementById("modal");
	if (!modal) return;

	let issue = issuePreview || {};
	renderModalIssue(issue);
	modal.style.display = "grid";

	const issueId = issuePreview?._id || issuePreview?.id;
	if (!issueId) return;

	try {
		const res = await fetch(`${ISSUE_API}/${issueId}`);
		const data = await res.json();
		issue = data?.data || issue;
		renderModalIssue(issue);
	} catch (error) {
		console.error(error);
	}
}

function closeModal() {
	const modal = document.getElementById("modal");
	if (modal) modal.style.display = "none";
}

async function searchIssue() {
	const input = document.getElementById("searchInput");
	const text = input?.value?.trim() || "";
	const activeType = getActiveTabType();

	if (!text) {
		loadIssues(activeType);
		return;
	}

	setIssuesLoading(true);

	try {
		const res = await fetch(`https://phi-lab-server.vercel.app/api/v1/lab/issues/search?q=${encodeURIComponent(text)}`);
		const data = await res.json();
		const searchedIssues = data.data || [];
		updateStats(searchedIssues, activeType);

		let filteredIssues = searchedIssues;
		if (activeType === "open") filteredIssues = searchedIssues.filter((issue) => issue.status === "open");
		if (activeType === "closed") filteredIssues = searchedIssues.filter((issue) => issue.status === "closed");

		displayIssues(filteredIssues);
	} catch (error) {
		console.error(error);
		updateStats([], activeType);
		displayIssues([]);
	} finally {
		setIssuesLoading(false);
	}
}

function checkAccess() {
	if (window.location.pathname.includes("dashboard.html") && localStorage.getItem("loggedIn") !== "true") {
		window.location.href = "index.html";
	}
}

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape") closeModal();
	if (event.key === "Enter" && window.location.pathname.includes("index.html")) login();
});

document.addEventListener("click", (event) => {
	const modal = document.getElementById("modal");
	if (modal && event.target === modal) closeModal();
});

checkAccess();
if (window.location.pathname.includes("dashboard.html")) loadIssues();