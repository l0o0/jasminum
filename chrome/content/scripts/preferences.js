	initPreferences = function() {
		scihub_url = Zotero.Scihub.scihub_url();
		automatic_pdf_download_bool = Zotero.Scihub.automatic_pdf_download();

		// Apply setting to
		document.getElementById('id-zoteroscihub-automatic-pdf-download').checked = automatic_pdf_download_bool
		document.getElementById('id-zoteroscihub-scihub-url').value = scihub_url
	}
