/**
 * SmartTables - A modern, responsive table library
 * @copyright SmartAdmin WebApp Copyright 2025-2026
 * @author Sunnyat Ahmmed
 * @homepage https://www.gotbootstrap.com
 * @version 1.0.0
 */

export class SmartTables {
  /**
   * @param {string|HTMLElement} selector - Table element or selector
   * @param {Object} options - Configuration options
   */
  constructor(selector, options) {
    // Default options
    this.defaults = {
      perPage: 10,
      // Number of rows per page (default: 10)
      search: true,
      sort: true,
      pagination: true,
      export: false,
      print: false,
      import: false,
      loading: {
        enabled: true,
        duration: 0,
        // Duration of the loading animation (default: 0)
        minDuration: 300 // Minimum duration of the loading animation (default: 300)
      },
      responsive: {
        enabled: false,
        breakpoint: 768,
        columnPriorities: {
          0: 1,
          1: 2,
          2: 3,
          3: 4,
          4: 5,
          5: 6
        },
        details: {
          type: 'column',
          // 'column', 'row'
          target: 0 // '0' First column, '1' First row
        }
      },
      debug: false,
      fuzzyMatch: {
        threshold: 0.7,
        // '0' No fuzzy matching (exact match only), '1' Full fuzzy matching
        minMatchLength: 2,
        // '1' Allow searching even for single characters
        multiWordThreshold: 0.5,
        // '1' Require full word matches, '0.5' Allow partial word matches
        maxDistance: 2 // '0' No character mismatches allowed, '1' Allow searching for matches with 1 distance
      },
      classes: {
        wrapper: 'st-wrapper',
        table: 'st-table table table-striped table-hover',
        toolbar: 'st-toolbar d-flex justify-content-between mb-3',
        search: 'st-search form-control',
        pagination: 'st-pagination pagination justify-content-center',
        export: 'st-export btn-group'
      },
      data: {
        type: null,
        // 'json', 'csv', 'ajax'
        source: null,
        // 'url' or 'data'
        columns: [],
        // 'id', 'name', 'position'
        processing: false,
        // 'true' or 'false'
        serverSide: false,
        // 'true' or 'false'
        method: 'GET',
        // 'GET', 'POST'
        headers: {},
        // 'Content-Type': 'application/json'
        params: {},
        // 'id': 1, 'name': 'John Doe'
        parser: null // 'function' or 'null'
      },
      hooks: {
        beforeInit: null,
        afterInit: null,
        beforeDestroy: null,
        afterDestroy: null,
        beforeDataLoad: null,
        afterDataLoad: null,
        beforeDraw: null,
        afterDraw: null,
        beforeEdit: null,
        afterEdit: null,
        beforeSave: null,
        afterSave: null,
        onSort: null,
        onFilter: null,
        onPaginate: null,
        onExport: null,
        onImport: null,
        onResize: null
      },
      plugins: []
    };

    // Handle the case where responsive is a boolean
    if (typeof options.responsive === 'boolean') {
      options.responsive = {
        enabled: options.responsive
      };
    }
    this.options = {
      ...this.defaults,
      ...options
    };
    this.table = typeof selector === 'string' ? document.getElementById(selector) : selector;
    this.table.__smartTable = this;
    this.currentPage = 1;
    this.rows = [];
    this.filteredRows = [];
    this.hiddenColumns = [];
    this.columnWidths = [];
    this.plugins = [];
    this.responsiveColumns = [];
    this.init();
  }

  // Utility functions as static methods
  static extend(target, ...sources) {
    sources.forEach(source => {
      if (source) {
        Object.keys(source).forEach(prop => {
          if (source.hasOwnProperty(prop)) {
            target[prop] = source[prop];
          }
        });
      }
    });
    return target;
  }
  static debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  static createNode(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
  }
  init() {
    if (!this.table && !this.options.data.source) {
      console.error('SmartTables: No table element or data source found');
      return;
    }

    // Create wrapper first
    this.setupWrapper();

    // Log initial width
    this.log('Initial container width:', this.wrapper.offsetWidth);

    // Show loading if enabled
    if (this.options.loading.enabled) {
      this.wrapper.classList.add('st-loading');
      const spinner = document.createElement('div');
      spinner.className = 'st-loading-spinner';
      this.wrapper.appendChild(spinner);
    }

    // Initialize based on data source
    if (this.options.data.source) {
      this.loadDataSource();
    } else {
      this.initializeTable();
    }

    // Initialize plugins
    this.initializePlugins();

    // Call beforeInit hook
    this.callHook('beforeInit');

    // Log width after initialization
    this.log('Width after initialization:', this.wrapper.offsetWidth);

    // Add a delayed width check
    const self = this;
    setTimeout(() => {
      this.log('Width after 100ms delay:', this.wrapper.offsetWidth);

      // If width changed significantly, recalculate responsive layout
      var currentWidth = self.wrapper.offsetWidth;
      if (Math.abs(currentWidth - self.containerWidth) > 5) {
        self.log('Width changed significantly, recalculating layout', 'Initial:', self.containerWidth, 'Current:', currentWidth);
        self.containerWidth = currentWidth;
        // Only calculate column widths and check responsive display if responsive is enabled
        if (self.options.responsive.enabled) {
          // <-- Add this condition
          self.calculateColumnWidths();
          self.checkResponsiveDisplay();
        }
      }
    }, 100);
  }
  loadDataSource() {
    // Load data based on the type
    switch (this.options.data.type) {
      case 'json':
        this.loadJSON();
        break;
      case 'csv':
        this.loadCSV();
        break;
      case 'ajax':
        this.loadAjax();
        break;
      case 'txt':
        this.loadTXT();
        break;
      case 'excel':
        this.loadExcel();
        break;
      default:
        console.error('SmartTables: Invalid data source type');
        break;
    }
  }
  loadJSON() {
    const self = this;
    if (typeof this.options.data.source === 'string') {
      // Load from URL
      fetch(this.options.data.source).then(response => response.json()).then(data => self.processData(data)).catch(error => {
        console.error('SmartTables: Error loading JSON:', error);
        self.hideLoading();
      });
    } else if (typeof this.options.data.source === 'object') {
      // Direct JSON data
      this.processData(this.options.data.source);
    }
  }
  loadCSV() {
    const self = this;
    if (typeof this.options.data.source === 'string') {
      if (this.options.data.source.startsWith('data:')) {
        // CSV string
        this.parseCSV(this.options.data.source);
      } else {
        // Load from URL
        fetch(this.options.data.source).then(response => response.text()).then(csv => self.parseCSV(csv)).catch(error => {
          console.error('SmartTables: Error loading CSV:', error);
          self.hideLoading();
        });
      }
    }
  }
  loadAjax() {
    const self = this;

    // Prepare request options
    const options = {
      method: this.options.data.method,
      headers: this.options.data.headers
    };

    // Add params to URL for GET requests
    let url = this.options.data.source;
    if (this.options.data.method === 'GET' && Object.keys(this.options.data.params).length > 0) {
      url += '?' + new URLSearchParams(this.options.data.params).toString();
    } else if (this.options.data.method === 'POST') {
      options.body = JSON.stringify(this.options.data.params);
    }
    fetch(url, options).then(response => response.json()).then(data => self.processData(data)).catch(error => {
      console.error('SmartTables: Error loading data:', error);
      self.hideLoading();
    });
  }
  parseCSV(csvText) {
    try {
      // Simple CSV parser
      const lines = csvText.split(/\r\n|\n/);
      if (!lines.length) {
        throw new Error("No data found in CSV");
      }

      // Get headers - properly handle quoted values
      const headerLine = lines[0];
      const headers = this.parseCSVLine(headerLine);
      const result = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        // Parse the line properly handling quoted values
        const values = this.parseCSVLine(lines[i]);

        // Skip if we don't have enough values
        if (values.length < headers.length) {
          console.warn('SmartTables: Line ' + i + ' has fewer values than headers, skipping');
          continue;
        }
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = values[j];
        }
        result.push(obj);
      }
      return result;
    } catch (error) {
      console.error('CSV parsing error:', error);
      throw new Error('Failed to parse CSV: ' + error.message);
    }
  }

  // Helper method to properly parse CSV lines with quoted values
  parseCSVLine(line) {
    const result = [];
    let inQuote = false;
    let currentValue = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(currentValue.trim().replace(/^"(.*)"$/, '$1'));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    // Add the last value
    result.push(currentValue.trim().replace(/^"(.*)"$/, '$1'));
    return result;
  }
  processData(data) {
    try {
      // Use custom parser if provided
      if (this.options.data.parser) {
        data = this.options.data.parser(data);
      }

      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error('SmartTables: Data must be an array of objects');
        this.showNotification('Invalid data format. Expected an array of objects.', 'danger');
        data = [];
      }

      // Auto-detect columns if not defined
      if (!this.options.data.columns || this.options.data.columns.length === 0) {
        this.options.data.columns = this.detectColumns(data);
      }

      // Clear existing table data if loading from data source
      if (this.table) {
        var tbody = this.table.querySelector('tbody');
        if (tbody) {
          tbody.innerHTML = ''; // Clear existing rows
        } else {
          tbody = document.createElement('tbody');
          this.table.appendChild(tbody);
        }

        // If there's no thead, create it from data columns
        var thead = this.table.querySelector('thead');
        if (!thead) {
          thead = document.createElement('thead');
          var headerRow = document.createElement('tr');
          this.options.data.columns.forEach(function (column) {
            var th = document.createElement('th');
            th.textContent = column.title || column.data;
            if (column.width) th.style.width = column.width;
            if (column.class) th.className = column.class;
            headerRow.appendChild(th);
          });
          thead.appendChild(headerRow);
          this.table.insertBefore(thead, tbody);
        } else {
          // Always recreate header when processing new data
          thead.innerHTML = '';
          var headerRow = document.createElement('tr');
          this.options.data.columns.forEach(function (column) {
            var th = document.createElement('th');
            th.textContent = column.title || column.data;
            if (column.width) th.style.width = column.width;
            if (column.class) th.className = column.class;
            headerRow.appendChild(th);
          });
          thead.appendChild(headerRow);
        }
      } else {
        // Create new table if it doesn't exist
        this.createTableFromData(data);
      }

      // Update rows with new data
      this.updateTableData(data);

      // Initialize table
      this.initializeTable();
    } catch (error) {
      console.error('Error processing data:', error);
      this.showNotification('Error processing data: ' + error.message, 'danger');
      this.hideLoading();
    }
  }
  createTableFromData(data) {
    this.table = document.createElement('table');
    this.wrapper.appendChild(this.table);

    // Create header
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    this.options.data.columns.forEach(function (column) {
      var th = document.createElement('th');
      th.textContent = column.title || column.data;
      if (column.width) th.style.width = column.width;
      if (column.class) th.className = column.class;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    this.table.appendChild(thead);

    // Create tbody
    var tbody = document.createElement('tbody');
    this.table.appendChild(tbody);
  }
  updateTableData(data) {
    try {
      var tbody = this.table.querySelector('tbody');
      tbody.innerHTML = ''; // Clear any existing rows

      // Ensure data is an array before iterating
      if (!Array.isArray(data)) {
        console.error('SmartTables: Data must be an array of objects');
        this.showNotification('Invalid data format. Expected an array of objects.', 'danger');
        return;
      }
      data.forEach(function (item) {
        var row = document.createElement('tr');
        this.options.data.columns.forEach(function (column) {
          var cell = document.createElement('td');

          // Handle custom render function
          if (column.render) {
            cell.innerHTML = column.render(item[column.data], item);
          } else {
            cell.textContent = item[column.data] || '';
          }
          if (column.class) cell.className = column.class;
          row.appendChild(cell);
        });
        tbody.appendChild(row);
      }, this);
    } catch (error) {
      console.error('Error updating table data:', error);
      this.showNotification('Error updating table: ' + error.message, 'danger');
    }
  }
  hideLoading() {
    if (this.options.loading.enabled) {
      this.wrapper.classList.remove('st-loading');
      var spinner = this.wrapper.querySelector('.st-loading-spinner');
      if (spinner) spinner.remove();
    }
  }
  setupWrapper() {
    // Create wrapper div that will contain the table
    this.wrapper = document.createElement('div');
    this.wrapper.className = this.options.classes.wrapper;
    this.wrapper.style.position = 'relative';
    this.wrapper.style.width = '100%'; // Ensure wrapper takes full width

    // Insert wrapper before table in the DOM
    this.table.parentNode.insertBefore(this.wrapper, this.table);

    // Move table inside wrapper
    this.wrapper.appendChild(this.table);
    this.table.className = this.options.classes.table;

    // Set table to take full width of wrapper
    this.table.style.width = '100%';
  }
  initializeTable() {
    try {
      // Setup initial table structure
      this.setupToolbar();
      this.setupTable();

      // Get table rows
      var tbody = this.table.querySelector('tbody');
      this.originalRows = Array.from(tbody.rows);
      this.rows = Array.from(tbody.rows).map(function (row, index) {
        return {
          element: row,
          expanded: false,
          originalIndex: index
        };
      });
      this.filteredRows = this.rows.slice();

      // Make table slightly visible during calculations
      this.table.style.opacity = '0.01';

      // Use requestAnimationFrame to ensure DOM is fully rendered before measuring
      requestAnimationFrame(() => {
        // Calculate column widths after DOM is ready
        this.calculateColumnWidths();
        this.draw();

        // Remove loading state after calculations are complete
        if (this.options.loading.enabled) {
          setTimeout(() => {
            this.wrapper.classList.remove('st-loading');
            this.table.style.opacity = '1';

            // Remove spinner element if it exists
            var spinner = this.wrapper.querySelector('.st-loading-spinner');
            if (spinner) spinner.remove();

            // Show success notification if this was an import operation
            if (this.isImportOperation) {
              this.showNotification('Successfully imported ' + this.rows.length + ' rows', 'success');
              this.isImportOperation = false;
            }
          }, this.options.loading.duration || 300);
        }
      });
    } catch (error) {
      console.error('Error initializing table:', error);

      // Clean up if there's an error
      if (this.options.loading.enabled) {
        this.wrapper.classList.remove('st-loading');
        this.table.style.opacity = '1';
        var spinner = this.wrapper.querySelector('.st-loading-spinner');
        if (spinner) spinner.remove();
      }
    }

    // Call afterInit hook if defined
    this.callHook('afterInit');
  }
  calculateColumnWidths() {
    var self = this;

    // Exit early if responsiveColumns is not populated (e.g., responsive is disabled)
    if (!Array.isArray(this.responsiveColumns) || this.responsiveColumns.length === 0) {
      this.log('Skipping column width calculation: responsiveColumns not populated');
      return;
    }

    // Get the container width directly from the wrapper element
    const containerWidth = this.wrapper.getBoundingClientRect().width;
    this.log('Container width:', containerWidth);

    // Create a clone for measurement
    var tableClone = this.table.cloneNode(true);

    // Reset any previous styling that might affect width
    tableClone.style.width = 'auto';
    tableClone.style.tableLayout = 'auto';

    // Position the clone off-screen
    tableClone.style.position = 'absolute';
    tableClone.style.top = '-9999px';
    tableClone.style.left = '-9999px';
    tableClone.style.visibility = 'hidden';

    // Make all cells visible for measurement
    var hiddenCells = tableClone.querySelectorAll('th[style*="display: none"], td[style*="display: none"]');
    for (var i = 0; i < hiddenCells.length; i++) {
      hiddenCells[i].style.display = '';
    }

    // Add to DOM for measurement
    document.body.appendChild(tableClone);

    // Calculate total width needed for all columns
    let totalColumnsWidth = 0;

    // Measure each column's natural width
    this.responsiveColumns.forEach(function (column) {
      // Get the header cell
      var headerCell = tableClone.querySelector('thead th:nth-child(' + (column.index + 1) + ')');

      // Measure the natural width
      column.minWidth = headerCell ? headerCell.offsetWidth : 0;

      // Also check cell contents in all rows for better accuracy
      var rows = tableClone.querySelectorAll('tbody tr');
      for (var i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].cells[column.index]) {
          column.minWidth = Math.max(column.minWidth, rows[i].cells[column.index].offsetWidth);
        }
      }

      // Add a small buffer
      column.minWidth += 5;
      totalColumnsWidth += column.minWidth;
      self.log('Column', column.index, 'min width:', column.minWidth);
    });

    // Clean up
    document.body.removeChild(tableClone);

    // Store the container width for responsive calculations
    this.containerWidth = containerWidth;
    this.log('Stored container width:', this.containerWidth);
    this.log('Total columns width needed:', totalColumnsWidth);

    // Update the responsive display - hide columns as needed
    this.applyResponsiveDisplay(containerWidth, totalColumnsWidth);
  }
  applyResponsiveDisplay(containerWidth, totalColumnsWidth) {
    // If total width of columns exceeds container, we need to hide columns
    if (totalColumnsWidth > containerWidth) {
      this.log('Applying responsive column visibility');

      // Sort columns by priority (higher number = lower priority = hide first)
      const sortedColumns = [...this.responsiveColumns].sort((a, b) => b.priority - a.priority);
      let currentTotalWidth = totalColumnsWidth;
      let columnsToHide = [];

      // Determine which columns to hide
      for (const column of sortedColumns) {
        if (currentTotalWidth <= containerWidth) {
          break;
        }
        columnsToHide.push(column.index);
        currentTotalWidth -= column.minWidth;
        this.log('Hiding column', column.index, 'to save', column.minWidth, 'px');
      }

      // Apply visibility to columns
      this.responsiveColumns.forEach(column => {
        const cells = this.table.querySelectorAll(`tr > *:nth-child(${column.index + 1})`);
        const shouldHide = columnsToHide.includes(column.index);
        cells.forEach(cell => {
          cell.style.display = shouldHide ? 'none' : '';
        });
      });
    } else {
      // Show all columns if there's enough space
      this.log('Showing all columns');
      this.responsiveColumns.forEach(column => {
        const cells = this.table.querySelectorAll(`tr > *:nth-child(${column.index + 1})`);
        cells.forEach(cell => {
          cell.style.display = '';
        });
      });
    }

    // After applying changes, re-setup content observers
    if (this.options.contentObserver) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        this.setupContentObservers();
      }, 0);
    }
  }
  setupToolbar() {
    // Create toolbar with flex layout
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'st-toolbar row mb-4';

    // Create left column for search
    var leftCol = document.createElement('div');
    leftCol.className = 'col-12 col-sm-6 col-lg-6 col-xl-5 col-xxl-4 order-1 order-sm-0 mt-4 mt-sm-0';

    // Create search wrapper
    if (this.options.search) {
      var searchWrapper = document.createElement('div');
      searchWrapper.className = 'st-search-wrapper';
      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'st-search form-control';
      searchInput.placeholder = 'Search...';
      searchWrapper.appendChild(searchInput);
      var self = this;
      searchInput.addEventListener('input', function () {
        self.handleSearch(this.value);
      });
      leftCol.appendChild(searchWrapper);
    }

    // Create right column for export buttons
    var exportCol = document.createElement('div');
    exportCol.className = 'col d-flex justify-content-end gap-2';

    // Add print button if enabled
    if (this.options.print) {
      var printBtn = document.createElement('button');
      printBtn.className = 'btn btn-sm btn-outline-secondary btn-icon h-100 order-1 px-3 fs-xl';
      printBtn.innerHTML = '<i class="sa sa-printer"></i>';
      printBtn.addEventListener('click', function () {
        window.print();
      });
      exportCol.appendChild(printBtn);
    }

    // Add import button if enabled
    if (this.options.import) {
      var importBtn = document.createElement('button');
      importBtn.className = 'btn btn-sm btn-outline-success d-flex align-items-center gap-1';
      importBtn.setAttribute('data-bs-toggle', 'modal');
      importBtn.setAttribute('data-bs-target', '#importModal');
      importBtn.innerHTML = '<i class="sa sa-cloud-upload"></i> Import';
      exportCol.appendChild(importBtn);

      // Create import modal only if import is enabled
      this.createImportModal();
    }

    // Add export dropdown
    if (this.options.export) {
      var btnGroup = document.createElement('div');
      btnGroup.className = 'btn-group';
      var exportBtn = document.createElement('button');
      exportBtn.className = 'btn btn-sm btn-outline-primary dropdown-toggle';
      exportBtn.setAttribute('data-bs-toggle', 'dropdown');
      exportBtn.textContent = 'Export';
      var dropdownMenu = document.createElement('ul');
      dropdownMenu.className = 'dropdown-menu';
      var exportOptions = [{
        format: 'excel',
        label: 'Excel'
      }, {
        format: 'csv',
        label: 'CSV'
      }, {
        format: 'copy',
        label: 'Copy'
      }, {
        format: 'pdf',
        label: 'PDF'
      }, {
        format: 'json',
        label: 'JSON'
      }, {
        format: 'xml',
        label: 'XML'
      }, {
        format: 'html',
        label: 'HTML'
      }];
      exportOptions.forEach(function (option) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.className = 'dropdown-item';
        a.href = '#';
        a.textContent = option.label;
        a.addEventListener('click', function (e) {
          e.preventDefault();
          self.exportData(option.format);
        });
        li.appendChild(a);
        dropdownMenu.appendChild(li);
      });
      btnGroup.appendChild(exportBtn);
      btnGroup.appendChild(dropdownMenu);
      exportCol.appendChild(btnGroup);
    }

    // Add columns to toolbar
    this.toolbar.appendChild(leftCol);
    this.toolbar.appendChild(exportCol);

    // Add toolbar to wrapper
    this.wrapper.insertBefore(this.toolbar, this.table);
  }
  createImportModal() {
    var self = this;
    var modalId = 'importModal';

    // Check if modal already exists
    if (document.getElementById(modalId)) {
      return;
    }

    // Create modal structure
    var modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = modalId;
    modal.tabIndex = -1;
    modal.setAttribute('aria-labelledby', 'importModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    var modalDialog = document.createElement('div');
    modalDialog.className = 'modal-dialog modal-dialog-centered';
    var modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Modal header
    var modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    var modalTitle = document.createElement('h5');
    modalTitle.className = 'modal-title';
    modalTitle.id = 'importModalLabel';
    modalTitle.textContent = 'Import Data';
    var closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn btn-system ms-auto';
    closeButton.setAttribute('data-bs-dismiss', 'modal');
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.innerHTML = '<svg class="sa-icon sa-icon-2x"><use href="img/sprite.svg#x"></use></svg>';
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    // Modal body
    var modalBody = document.createElement('div');
    modalBody.className = 'modal-body';

    // Status message (moved above dropzone)
    var statusMessage = document.createElement('div');
    statusMessage.className = 'alert d-none mb-3';
    modalBody.appendChild(statusMessage);
    var dropZone = document.createElement('div');
    dropZone.className = 'st-dropzone p-5 text-center d-flex flex-column align-items-center border border-2 border-dashed rounded bg-faded';
    dropZone.innerHTML = '<svg class="sa-icon sa-icon-success sa-thin sa-icon-5x mb-2"><use href="img/sprite.svg#upload-cloud"></use></svg><p>Drag and drop your CSV or JSON file here<br>or <b class="text-primary fw-500 cursor-pointer">click to browse</b></p>';
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'visually-hidden';
    fileInput.accept = '.csv,.json';
    dropZone.appendChild(fileInput);
    modalBody.appendChild(dropZone);

    // Modal footer
    var modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    var cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn btn-danger';
    cancelButton.setAttribute('data-bs-dismiss', 'modal');
    cancelButton.textContent = 'Cancel';
    var importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.className = 'btn btn-success';
    importButton.textContent = 'Import';
    importButton.disabled = true;
    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(importButton);

    // Assemble modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalDialog.appendChild(modalContent);
    modal.appendChild(modalDialog);
    document.body.appendChild(modal);

    // Setup event listeners
    dropZone.addEventListener('click', function () {
      fileInput.click();
    });
    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropZone.classList.add('border-primary');
    });
    dropZone.addEventListener('dragleave', function () {
      dropZone.classList.remove('border-primary');
    });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('border-primary');
      if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', function () {
      if (this.files.length) {
        handleFile(this.files[0]);
      }
    });

    // Clear status message when modal is opened
    modal.addEventListener('show.bs.modal', function () {
      statusMessage.className = 'alert d-none mb-3';
      statusMessage.textContent = '';
      importButton.disabled = true;
      fileInput.value = '';
    });
    var fileData = null;
    function handleFile(file) {
      statusMessage.className = 'alert alert-info mb-3';
      statusMessage.textContent = 'Reading file...';
      importButton.disabled = true;
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var fileName = file.name.toLowerCase();
          // Truncate filename if too long
          var displayName = file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name;
          if (fileName.endsWith('.json')) {
            try {
              fileData = JSON.parse(e.target.result);
              statusMessage.className = 'alert alert-success mb-3';
              statusMessage.innerHTML = 'JSON file <b>' + displayName + '</b> loaded successfully. Ready to import.';
              importButton.disabled = false;
            } catch (parseError) {
              statusMessage.className = 'alert alert-danger mb-3';
              statusMessage.innerHTML = 'Invalid JSON format in file <b>' + displayName + '</b>: ' + parseError.message;
            }
          } else if (fileName.endsWith('.csv')) {
            try {
              fileData = self.parseCSV(e.target.result);
              statusMessage.className = 'alert alert-success mb-3';
              statusMessage.innerHTML = 'CSV file <b>' + displayName + '</b> loaded successfully. Ready to import.';
              importButton.disabled = false;
            } catch (parseError) {
              statusMessage.className = 'alert alert-danger mb-3';
              statusMessage.innerHTML = 'Invalid CSV format in file <b>' + displayName + '</b>: ' + parseError.message;
            }
          } else {
            statusMessage.className = 'alert alert-danger mb-3';
            statusMessage.innerHTML = 'Unsupported file format: <b>' + displayName + '</b>. Please use CSV or JSON.';
          }
        } catch (error) {
          statusMessage.className = 'alert alert-danger mb-3';
          statusMessage.innerHTML = 'Error processing file <b>' + file.name + '</b>: ' + error.message;
        }
      };
      reader.onerror = function () {
        statusMessage.className = 'alert alert-danger mb-3';
        statusMessage.innerHTML = 'Error reading file <b>' + file.name + '</b>.';
      };

      // Check file extension before attempting to read
      var fileName = file.name.toLowerCase();
      if (fileName.endsWith('.json') || fileName.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        statusMessage.className = 'alert alert-danger mb-3';
        statusMessage.innerHTML = 'Unsupported file format: <b>' + file.name + '</b>. Please use CSV or JSON.';
      }
    }
    importButton.addEventListener('click', function () {
      if (fileData) {
        self.importData(fileData);
        var modalInstance = bootstrap.Modal.getInstance(modal);
        modalInstance.hide();
      }
    });
  }
  importData(data) {
    try {
      // Set a flag to indicate this is an import operation
      this.isImportOperation = true;

      // Call beforeDataLoad hook
      this.callHook('beforeDataLoad', data);

      // Show loading screen
      if (this.options.loading.enabled) {
        this.wrapper.classList.add('st-loading');

        // Add spinner if it doesn't exist
        if (!this.wrapper.querySelector('.st-loading-spinner')) {
          var spinner = document.createElement('div');
          spinner.className = 'st-loading-spinner';
          this.wrapper.appendChild(spinner);
        }
      }

      // Completely destroy the current table instance
      this.destroy();

      // Reset options that should be regenerated
      this.options.data.columns = null;

      // Validate data format
      if (!data) {
        throw new Error('No data provided for import');
      }
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array of objects');
      }
      if (data.length === 0) {
        throw new Error('Data array is empty');
      }

      // Auto-detect columns from the new data
      this.options.data.columns = this.detectColumns(data);

      // Create a fresh table element if needed
      if (!this.table) {
        this.table = document.createElement('table');
        this.table.className = this.options.classes.table;
        this.wrapper.appendChild(this.table);
      }

      // Reset row tracking arrays to prevent data jumbling
      this.rows = [];
      this.filteredRows = [];
      this.originalRows = [];

      // Process the imported data with a fresh table
      this.processData(data);

      // Force a clean sort state
      var headers = this.table.querySelectorAll('th');
      headers.forEach(function (header) {
        header.classList.remove('st-sort-asc', 'st-sort-desc');
        header.classList.add('st-sort-neutral');
        header.removeAttribute('data-sort-state');
      });

      // Note: The loading screen will be hidden by the initializeTable method
      // which is called at the end of processData

      // Call onImport hook
      this.callHook('onImport', data);
    } catch (error) {
      console.error('Import error:', error);

      // Hide loading screen if there's an error
      this.hideLoading();

      // Show notification
      this.showNotification('Import failed: ' + error.message, 'danger');

      // Create error message in the table area
      if (this.table) {
        this.table.remove();
      }

      // Get the filename from the error if possible
      var errorMsg = document.createElement('div');
      errorMsg.className = 'alert alert-danger mt-3';

      // Extract filename if it exists in the modal
      var filename = '';
      var fileDisplay = document.querySelector('.modal .alert.alert-success');
      if (fileDisplay) {
        var filenameMatch = fileDisplay.innerHTML.match(/<b>(.*?)<\/b>/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Create error message with filename if available
      if (filename) {
        errorMsg.innerHTML = '<h4 class="alert-heading">Import Failed</h4>' + '<p>Failed to import <b>' + filename + '</b></p>' + '<hr>' + '<p class="mb-0">Error: ' + error.message + '</p>';
      } else {
        errorMsg.innerHTML = '<h4 class="alert-heading">Import Failed</h4>' + '<p>Error: ' + error.message + '</p>';
      }

      // Add error message to wrapper
      this.wrapper.appendChild(errorMsg);

      // Add a retry button
      var retryBtn = document.createElement('button');
      retryBtn.className = 'btn btn-primary mt-3';
      retryBtn.innerHTML = '<i class="sa sa-refresh"></i> Try Again';
      retryBtn.addEventListener('click', function () {
        // Reopen the import modal
        var importModal = document.getElementById('importModal');
        if (importModal) {
          var modal = new bootstrap.Modal(importModal);
          modal.show();
        }

        // Remove the error message
        errorMsg.remove();
        retryBtn.remove();

        // Create an empty table
        this.table = document.createElement('table');
        this.table.className = this.options.classes.table;
        this.wrapper.appendChild(this.table);

        // Initialize with empty data
        this.processData([]);
      }.bind(this));
      this.wrapper.appendChild(retryBtn);
    }
  }
  detectColumns(data) {
    if (!data || !data.length) {
      return [];
    }
    var firstRow = data[0];
    var columns = [];

    // Create columns from the keys in the first data row
    Object.keys(firstRow).forEach(function (key) {
      // For title, only add spaces before capital letters that aren't part of common abbreviations
      // This preserves terms like ID, URL, API, etc.
      let title = key;

      // First, capitalize the first letter
      if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }

      // Only add spaces for camelCase, not for abbreviations
      // This will convert "firstName" to "First Name" but preserve "userID" as "UserID"
      if (!/^[A-Z]+$/.test(title)) {
        // If not all uppercase (abbreviation)
        title = title.replace(/([a-z])([A-Z])/g, '$1 $2');
      }
      columns.push({
        data: key,
        title: title
      });
    });
    return columns;
  }
  setupTable() {
    var self = this;

    // Add responsive classes
    if (this.options.responsive.enabled) {
      this.table.classList.add('st-responsive');
    }

    // Setup sort handlers
    if (this.options.sort) {
      var headers = this.table.querySelectorAll('thead th');
      headers.forEach(function (header, index) {
        // Skip columns with data-sortable="false"
        if (header.getAttribute('data-sortable') === 'false') {
          return;
        }
        header.classList.add('st-sort-neutral');
        header.style.cursor = 'pointer';

        // Store the handler function so we can remove it later
        var handler = function () {
          // Remove sort classes from all other headers and column cells
          headers.forEach(function (h, i) {
            if (h !== header) {
              h.classList.remove('st-sort-asc', 'st-sort-desc');
              h.classList.add('st-sort-neutral');
              h.removeAttribute('data-sort-state');

              // Remove st-sort-column from cells in other columns
              Array.from(self.table.querySelectorAll('tbody tr')).forEach(function (row) {
                if (row.cells[i]) {
                  row.cells[i].classList.remove('st-sort-column');
                }
              });
            }
          });

          // Determine next sort state
          if (!header.hasAttribute('data-sort-state')) {
            // First click - ascending
            header.setAttribute('data-sort-state', 'asc');
            header.classList.remove('st-sort-neutral');
            header.classList.add('st-sort-asc');
            self.addSortColumnClass(index);
          } else if (header.getAttribute('data-sort-state') === 'asc') {
            // Second click - descending
            header.setAttribute('data-sort-state', 'desc');
            header.classList.remove('st-sort-asc');
            header.classList.add('st-sort-desc');
            self.addSortColumnClass(index);
          } else {
            // Third click - neutral (reset)
            header.removeAttribute('data-sort-state');
            header.classList.remove('st-sort-desc');
            header.classList.add('st-sort-neutral');
            self.removeSortColumnClass(index);
          }
          self.sortBy(index, header.getAttribute('data-sort-state'));
        };
        header._sortHandler = handler;
        header.addEventListener('click', handler);
      });
    }

    // Remove the code that adds expand buttons to rows
    // This section was previously adding expand buttons to first cells

    // Setup responsive row handlers
    if (this.options.responsive.enabled) {
      this.setupResponsiveRows();
    }

    // Setup responsive column handling
    if (this.options.responsive.enabled) {
      this.setupResponsive();
    }
  }
  handleSearch(value) {
    var searchText = value.toLowerCase().trim();

    // Early exit if search is empty - show all rows
    if (!searchText) {
      this.filteredRows = this.rows.slice();
      this.removeNoResultsMessage();
      this.currentPage = 1;
      this.draw();
      this.callHook('onFilter', value, this.filteredRows);
      return;
    }

    // Detect search patterns
    var patterns = {
      isDate: /^\d{1,4}[-/.]?\d{1,2}[-/.]?\d{1,4}$/.test(searchText),
      isMoney: /^\$?\d+(?:,\d{3})*(?:\.\d{1,2})?$/.test(searchText),
      isPhone: this.extractPhoneNumber(searchText),
      isEmail: /@/.test(searchText),
      isNumeric: /^[<>]=?|=|!=?\s*\d+(?:\.\d+)?$/.test(searchText),
      isTime: /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(searchText),
      isURL: /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\/\S*)?$/.test(searchText),
      isIP: /^(\d{1,3}\.){3}\d{1,3}$/.test(searchText),
      isUUID: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(searchText),
      isBoolean: /^(true|false|yes|no|1|0)$/i.test(searchText),
      isHexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(searchText),
      isAlphanumeric: /^[a-zA-Z0-9\s-]+$/.test(searchText),
      isSocialSecurity: /^\d{3}-\d{2}-\d{4}$/.test(searchText)
    };

    // Cache numeric comparison if needed
    var numericComparison = this.parseNumericComparison(searchText);

    // Remove any existing no results message
    this.removeNoResultsMessage();

    // Filter rows
    this.filteredRows = this.rows.filter(function (row) {
      return Array.from(row.element.cells).some(function (cell) {
        var cellText = cell.textContent.toLowerCase();
        var cellContent = cell.innerHTML.toLowerCase();

        // Quick check for exact match
        if (cellText.includes(searchText)) {
          return true;
        }

        // Regular fuzzy search
        if (this.fuzzyMatch(cellText, searchText)) {
          return true;
        }

        // Handle date searches
        if (patterns.isDate) {
          var cellDate = this.parseDate(cellText);
          var searchDate = this.parseDate(searchText);
          if (cellDate && searchDate) {
            return cellDate.getTime() === searchDate.getTime();
          }
        }

        // Handle money/currency searches
        if (patterns.isMoney) {
          var numericSearch = parseFloat(searchText.replace(/[$,]/g, ''));
          var numericCell = parseFloat(cellText.replace(/[$,]/g, ''));
          if (!isNaN(numericSearch) && !isNaN(numericCell)) {
            return numericCell === numericSearch;
          }
        }

        // Handle phone number searches
        if (patterns.isPhone) {
          var cellPhone = this.extractPhoneNumber(cellText);
          return cellPhone && cellPhone.includes(patterns.isPhone);
        }

        // Handle email searches
        if (patterns.isEmail) {
          return this.emailMatch(cellText, searchText);
        }

        // Handle numeric comparisons (>, <, =)
        if (numericComparison) {
          var cellNumber = parseFloat(cellText.replace(/[^\d.-]/g, ''));
          if (!isNaN(cellNumber)) {
            switch (numericComparison.operator) {
              case '>':
                return cellNumber > numericComparison.value;
              case '<':
                return cellNumber < numericComparison.value;
              case '>=':
                return cellNumber >= numericComparison.value;
              case '<=':
                return cellNumber <= numericComparison.value;
              case '!=':
                return Math.abs(cellNumber - numericComparison.value) > 0.001;
              default:
                return Math.abs(cellNumber - numericComparison.value) < 0.001;
              // Approximate equality for floats
            }
          }
        }

        // Check for HTML content matches (for cells with formatted content)
        if (cellContent !== cellText && cellContent.includes(searchText)) {
          return true;
        }
        return false;
      }, this);
    }, this);

    // Show no results message if needed
    if (this.filteredRows.length === 0) {
      this.showNoResultsMessage(value);
    }
    this.currentPage = 1;
    this.draw();

    // Call onFilter hook
    this.callHook('onFilter', value, this.filteredRows);
  }
  parseNumericComparison(searchText) {
    var match = searchText.match(/^([<>]=?|=|!=)?\s*(\d+(?:\.\d+)?)$/);
    if (match) {
      return {
        operator: match[1] || '=',
        value: parseFloat(match[2])
      };
    }
    return null;
  }
  emailMatch(text, search) {
    // Special handling for email searches
    if (!/@/.test(text)) return false;

    // Split email into parts
    var searchParts = search.split('@');
    var searchUser = searchParts[0];
    var searchDomain = searchParts.length > 1 ? searchParts[1] : '';
    if (!searchDomain) {
      // If only searching for username part
      return text.split('@')[0].includes(searchUser);
    }

    // Full email search
    var textParts = text.split('@');
    var textUser = textParts[0];
    var textDomain = textParts.length > 1 ? textParts[1] : '';
    return textUser.includes(searchUser) && textDomain.includes(searchDomain);
  }

  // Calculate Levenshtein distance between two strings
  levenshteinDistance(str1, str2) {
    var m = str1.length;
    var n = str2.length;

    // Create a matrix of size (m+1) x (n+1)
    var dp = [];
    for (var i = 0; i <= m; i++) {
      dp[i] = [];
      for (var j = 0; j <= n; j++) {
        dp[i][j] = 0;
      }
    }

    // Initialize the first row and column
    for (var i = 0; i <= m; i++) dp[i][0] = i;
    for (var j = 0; j <= n; j++) dp[0][j] = j;

    // Fill the matrix
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        var cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1,
        // deletion
        dp[i][j - 1] + 1,
        // insertion
        dp[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return dp[m][n];
  }
  fuzzyMatch(text, search) {
    // Skip if either text is empty or search is too short
    if (!text || !search || search.length < this.options.fuzzyMatch.minMatchLength) {
      return 0;
    }

    // Exact match first (case insensitive)
    if (text.includes(search)) {
      return 1.0; // Perfect match
    }

    // Handle multi-word search (match any word)
    var searchWords = search.split(/\s+/).filter(function (word) {
      return word.length >= this.options.fuzzyMatch.minMatchLength;
    }, this);
    if (searchWords.length > 1) {
      // Calculate match score for each word and return the best match
      var wordScores = searchWords.map(function (word) {
        return this.fuzzyMatch(text, word);
      }, this);

      // Calculate average score across all words
      var sum = 0;
      for (var i = 0; i < wordScores.length; i++) {
        sum += wordScores[i];
      }
      var avgScore = sum / wordScores.length;

      // If any word has a good match or the average is above threshold, consider it a match
      var bestScore = Math.max.apply(null, wordScores);
      if (bestScore > this.options.fuzzyMatch.threshold || avgScore > this.options.fuzzyMatch.multiWordThreshold) {
        return bestScore;
      }
      return 0;
    }

    // Check for typos using Levenshtein distance for short search terms
    if (search.length <= 10) {
      // Find best matching substring
      var bestMatchScore = 0;

      // For short search terms, check against each word in the text
      var textWords = text.split(/\s+/);
      for (var i = 0; i < textWords.length; i++) {
        var word = textWords[i];
        if (Math.abs(word.length - search.length) <= this.options.fuzzyMatch.maxDistance) {
          var distance = this.levenshteinDistance(word.toLowerCase(), search);
          if (distance <= this.options.fuzzyMatch.maxDistance) {
            // Convert distance to a similarity score (0-1)
            var similarity = 1 - distance / Math.max(word.length, search.length);
            bestMatchScore = Math.max(bestMatchScore, similarity);
          }
        }
      }
      if (bestMatchScore >= this.options.fuzzyMatch.threshold) {
        return bestMatchScore;
      }
    }

    // Sequential character matching (traditional fuzzy search)
    var searchChars = search.split('');
    var currentIndex = 0;
    var matchCount = 0;
    var consecutiveMatches = 0;
    var maxConsecutive = 0;

    // Try to find all characters in sequence
    for (var i = 0; i < searchChars.length; i++) {
      var char = searchChars[i];
      var prevIndex = currentIndex;
      currentIndex = text.indexOf(char, currentIndex);
      if (currentIndex === -1) {
        // Calculate partial match score if we've matched enough characters
        if (matchCount >= this.options.fuzzyMatch.minMatchLength) {
          var matchRatio = matchCount / searchChars.length;
          var consecutiveBonus = maxConsecutive / searchChars.length;

          // Weight the score: 70% for matched chars, 30% for consecutive matches
          var score = matchRatio * 0.7 + consecutiveBonus * 0.3;
          return score >= this.options.fuzzyMatch.threshold ? score : 0;
        }
        return 0;
      }
      matchCount++;

      // Check if this match is consecutive with the previous one
      if (currentIndex === prevIndex + 1) {
        consecutiveMatches++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
      } else {
        consecutiveMatches = 0;
      }
      currentIndex += 1;
    }

    // All characters matched
    return 1.0;
  }

  //column sort
  sortBy(columnIndex, direction) {
    // Store current sort state
    this.currentSortColumn = direction ? columnIndex : undefined;
    this.currentSortDirection = direction;
    if (!direction) {
      // Reset to original order using originalIndex
      this.filteredRows.sort(function (a, b) {
        return a.originalIndex - b.originalIndex;
      });

      // When resetting to neutral state, remove st-sort-column class from all cells
      if (this.table) {
        var allCells = this.table.querySelectorAll('.st-sort-column');
        allCells.forEach(function (cell) {
          cell.classList.remove('st-sort-column');
        });
      }
    } else {
      // Cache the comparison function for better performance
      var compareFn = this.getComparisonFunction(columnIndex, direction);
      this.filteredRows.sort(compareFn);
    }
    this.draw();

    // Call onSort hook
    this.callHook('onSort', columnIndex, direction);
  }
  getComparisonFunction(columnIndex, direction) {
    var self = this;
    return function (a, b) {
      var aVal = a.element.cells[columnIndex].textContent.trim();
      var bVal = b.element.cells[columnIndex].textContent.trim();

      // Try phone number comparison
      var aPhone = self.extractPhoneNumber(aVal);
      var bPhone = self.extractPhoneNumber(bVal);
      if (aPhone && bPhone) {
        return direction === 'asc' ? aPhone.localeCompare(bPhone) : bPhone.localeCompare(aPhone);
      }

      // Try date comparison
      var aDate = self.parseDate(aVal);
      var bDate = self.parseDate(bVal);
      if (aDate && bDate) {
        return direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
      }

      // Try numeric comparison (including currency)
      var aNum = self.extractNumber(aVal);
      var bNum = self.extractNumber(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Default to string comparison
      return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    };
  }
  extractPhoneNumber(str) {
    // Check if the string contains digits and common phone separators
    if (!/\d/.test(str)) return null;

    // Check for common phone number patterns with various formats
    // This will match formats like: 
    // - 501-240-920
    // - (123) 456-7890
    // - +1 234-567-8901
    // - 123.456.7890
    // - 123 456 7890
    var phonePattern = /^(?:\+?\d{1,3}[-\s.]?)?\(?(\d{3})\)?[-\s.]?(\d{3})[-\s.]?(\d{3,4})$/;
    var match = str.match(phonePattern);
    if (match) {
      // Extract only digits for comparison
      return str.replace(/[^0-9]/g, '');
    }

    // If no standard pattern matches but the string contains mostly digits and separators
    // (useful for non-standard phone formats)
    if (str.replace(/[\d\s\-().+]/g, '').length === 0 && str.replace(/[^0-9]/g, '').length >= 7) {
      return str.replace(/[^0-9]/g, '');
    }
    return null;
  }
  parseDate(str) {
    // Enhanced date parsing to handle more formats
    if (!str) return null;

    // Try standard date formats first
    var date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Handle common date formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
    var patterns = [
    // MM/DD/YYYY or MM-DD-YYYY
    {
      regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
      handler: function (m) {
        return new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]));
      }
    },
    // DD/MM/YYYY or DD-MM-YYYY
    {
      regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
      handler: function (m) {
        return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
      }
    },
    // YYYY/MM/DD or YYYY-MM-DD
    {
      regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
      handler: function (m) {
        return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
      }
    },
    // Month name formats: Jan 1, 2023 or January 1, 2023
    {
      regex: /^([a-zA-Z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/,
      handler: function (m) {
        var months = {
          jan: 0,
          feb: 1,
          mar: 2,
          apr: 3,
          may: 4,
          jun: 5,
          jul: 6,
          aug: 7,
          sep: 8,
          oct: 9,
          nov: 10,
          dec: 11,
          january: 0,
          february: 1,
          march: 2,
          april: 3,
          may: 4,
          june: 5,
          july: 6,
          august: 7,
          september: 8,
          october: 9,
          november: 10,
          december: 11
        };
        var month = months[m[1].toLowerCase()];
        if (month !== undefined) {
          return new Date(parseInt(m[3]), month, parseInt(m[2]));
        }
        return null;
      }
    }];
    for (var i = 0; i < patterns.length; i++) {
      var matches = str.match(patterns[i].regex);
      if (matches) {
        var date = patterns[i].handler(matches);
        if (date && !isNaN(date.getTime())) {
          return date;
        }
      }
    }
    return null;
  }
  extractNumber(str) {
    // Extract numeric value from string, handling currency and other formats
    return parseFloat(str.replace(/[^0-9.-]+/g, ''));
  }
  draw() {
    const start = (this.currentPage - 1) * this.options.perPage;
    const end = start + this.options.perPage;
    const tbody = this.table.querySelector('tbody');

    // Store current hidden columns state
    const currentHiddenColumns = this.hiddenColumns.slice();

    // Store expanded states before redrawing
    const expandedStates = {};
    this.filteredRows.forEach(function (rowData) {
      if (rowData.expanded) {
        expandedStates[rowData.originalIndex] = true;
      }
    });
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }

    // Apply hidden state to new rows immediately
    this.filteredRows.slice(start, end).forEach(function (rowData) {
      var row = rowData.element.cloneNode(true);

      // Remove any st-sort-column classes before adding the row
      // This ensures we don't carry over sort classes from previous states
      Array.from(row.cells).forEach(function (cell) {
        cell.classList.remove('st-sort-column');
      });
      currentHiddenColumns.forEach(function (index) {
        if (row.cells[index]) {
          row.cells[index].style.display = 'none';
        }
      });
      tbody.appendChild(row);

      // Restore expanded state
      if (expandedStates[rowData.originalIndex]) {
        rowData.expanded = true;
        row.classList.add('expanded');

        // Add expand-active class to first cell
        if (row.cells[0]) {
          row.cells[0].classList.add('st-expand-active');
          row.cells[0].classList.add('st-expand');
        }
      }
    });
    if (this.options.pagination) {
      this.updatePagination();
    }

    // Apply the same hidden state to headers
    var headers = this.table.querySelectorAll('thead th');
    currentHiddenColumns.forEach(function (index) {
      if (headers[index]) {
        headers[index].style.display = 'none';
      }
    });
    if (this.options.responsive.enabled) {
      this.setupResponsiveRows();

      // Recreate expanded rows
      Array.from(tbody.querySelectorAll('tr.expanded')).forEach(function (row) {
        var rowIndex = Array.from(tbody.querySelectorAll('tr:not(.st-child-row)')).indexOf(row);
        var rowData = this.filteredRows[start + rowIndex];
        if (rowData) {
          rowData.element = row;
          this.updateExpandedRow(rowData);
        }
      }, this);
    }

    // After drawing rows, reapply sort column class if needed
    var sortedHeader = this.table.querySelector('th.st-sort-asc, th.st-sort-desc');
    if (sortedHeader) {
      var columnIndex = Array.from(sortedHeader.parentNode.children).indexOf(sortedHeader);
      this.addSortColumnClass(columnIndex);
    }

    // Call afterDraw hook
    this.callHook('afterDraw');
  }
  updatePagination() {
    if (this.paginationContainer) {
      this.paginationContainer.remove();
    }
    var totalPages = Math.ceil(this.filteredRows.length / this.options.perPage);

    // Create container row
    var container = document.createElement('div');
    container.className = 'row';

    // Create left column for entries dropdown and info text
    var infoCol = document.createElement('div');
    infoCol.className = 'col-12 col-sm-6 d-flex align-items-center justify-content-sm-start justify-content-center gap-2 order-1 order-sm-0';

    // Move entries dropdown here
    var entriesWrapper = document.createElement('div');
    entriesWrapper.className = 'dropdown';
    var entriesBtn = document.createElement('button');
    entriesBtn.className = 'btn btn-sm btn-outline-secondary dropdown-toggle pe-2 ps-2 py-1 no-arrow';
    entriesBtn.setAttribute('data-bs-toggle', 'dropdown');
    entriesBtn.innerHTML = this.options.perPage + ' <i class="sa sa-chevron-down"></i>';
    var entriesMenu = document.createElement('ul');
    entriesMenu.className = 'dropdown-menu';
    var entriesOptions = [10, 15, 25, 50, 100, 'All'];
    var self = this;
    entriesOptions.forEach(function (value) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'dropdown-item' + (self.options.perPage === value ? ' active' : '');
      a.href = '#';
      a.textContent = value;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var newValue = value === 'All' ? self.filteredRows.length : value;
        self.options.perPage = newValue;
        entriesBtn.innerHTML = value + ' <i class="sa sa-chevron-down"></i>';
        self.currentPage = 1;
        self.draw();

        // Update active state
        entriesMenu.querySelectorAll('.dropdown-item').forEach(function (item) {
          item.classList.remove('active');
        });
        this.classList.add('active');
      });
      li.appendChild(a);
      entriesMenu.appendChild(li);
    });
    entriesWrapper.appendChild(entriesBtn);
    entriesWrapper.appendChild(entriesMenu);

    // Add entries dropdown to info column
    infoCol.appendChild(entriesWrapper);

    // Add info text
    var start = (this.currentPage - 1) * this.options.perPage + 1;
    var end = Math.min(start + this.options.perPage - 1, this.filteredRows.length);
    var infoText = document.createElement('div');
    infoText.className = 'text-muted small';
    infoText.textContent = `Showing ${start} to ${end} of ${this.filteredRows.length} entries`;
    infoCol.appendChild(infoText);

    // Create right column for pagination
    var paginationCol = document.createElement('div');
    paginationCol.className = 'col-12 col-sm-6 d-flex align-items-center justify-content-sm-end justify-content-center mb-4 mb-sm-0';
    var nav = document.createElement('nav');
    var ul = document.createElement('ul');
    ul.className = 'pagination pagination-sm mb-0';
    var firstLi = document.createElement('li');
    firstLi.className = 'page-item st-first-page' + (this.currentPage === 1 ? ' disabled' : '');
    var firstLink = document.createElement('a');
    firstLink.className = 'page-link';
    firstLink.href = '#';
    firstLink.innerHTML = '«';
    firstLi.appendChild(firstLink);
    ul.appendChild(firstLi);
    var prevLi = document.createElement('li');
    prevLi.className = 'page-item st-prev-page' + (this.currentPage === 1 ? ' disabled' : '');
    var prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.innerHTML = '<span class="d-none d-sm-none d-md-inline-block">Prev</span> <span class="d-inline-block d-sm-inline-block d-md-none">‹</span>';
    prevLi.appendChild(prevLink);
    ul.appendChild(prevLi);
    var startPage = Math.max(1, this.currentPage - 1);
    var endPage = Math.min(totalPages, startPage + 2);
    startPage = Math.max(1, endPage - 2);
    if (startPage > 1) {
      ul.appendChild(this.createPageItem('1'));
      if (startPage > 2) {
        var ellipsisStart = document.createElement('li');
        ellipsisStart.className = 'page-item disabled';
        ellipsisStart.innerHTML = '<span class="page-link">...</span>';
        ul.appendChild(ellipsisStart);
      }
    }
    for (var i = startPage; i <= endPage; i++) {
      ul.appendChild(this.createPageItem(i.toString(), i === this.currentPage));
    }
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        var ellipsisEnd = document.createElement('li');
        ellipsisEnd.className = 'page-item disabled';
        ellipsisEnd.innerHTML = '<span class="page-link">...</span>';
        ul.appendChild(ellipsisEnd);
      }
      ul.appendChild(this.createPageItem(totalPages.toString()));
    }
    var nextLi = document.createElement('li');
    nextLi.className = 'page-item st-next-page' + (this.currentPage === totalPages ? ' disabled' : '');
    var nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.innerHTML = '<span class="d-none d-sm-none d-md-inline-block">Next</span> <span class="d-inline-block d-sm-inline-block d-md-none">›</span>';
    nextLi.appendChild(nextLink);
    ul.appendChild(nextLi);
    var lastLi = document.createElement('li');
    lastLi.className = 'page-item st-last-page' + (this.currentPage === totalPages ? ' disabled' : '');
    var lastLink = document.createElement('a');
    lastLink.className = 'page-link';
    lastLink.href = '#';
    lastLink.innerHTML = '»';
    lastLi.appendChild(lastLink);
    ul.appendChild(lastLi);
    nav.appendChild(ul);
    paginationCol.appendChild(nav);

    // Add columns to container
    container.appendChild(infoCol);
    container.appendChild(paginationCol);
    this.paginationContainer = container;
    this.wrapper.appendChild(container);

    // Add click handler
    var self = this;
    ul.addEventListener('click', function (e) {
      e.preventDefault();
      const link = e.target.closest('.page-link');
      if (!link) return;
      var newPage = self.currentPage;
      const parentItem = link.closest('.page-item');

      // Use classList checks instead of text content
      if (parentItem.classList.contains('st-first-page')) {
        newPage = 1;
      } else if (parentItem.classList.contains('st-prev-page')) {
        newPage = self.currentPage - 1;
      } else if (parentItem.classList.contains('st-next-page')) {
        newPage = self.currentPage + 1;
      } else if (parentItem.classList.contains('st-last-page')) {
        newPage = totalPages;
      } else {
        // For numbered pages, get the page number from a data attribute
        const pageNum = link.getAttribute('data-page');
        if (pageNum) {
          newPage = parseInt(pageNum);
        }
      }
      if (newPage !== self.currentPage && newPage >= 1 && newPage <= totalPages) {
        self.currentPage = newPage;
        self.draw();

        // Call onPaginate hook with the new page number
        self.callHook('onPaginate', newPage, self);
      }
    });
  }
  createPageItem(text, isActive) {
    var li = document.createElement('li');
    li.className = 'page-item' + (isActive ? ' active' : '');
    var link = document.createElement('a');
    link.className = 'page-link';
    link.href = '#';
    link.textContent = text;
    link.setAttribute('data-page', text); // Add page number as data attribute
    li.appendChild(link);
    return li;
  }
  setupResponsive() {
    if (!this.options.responsive.enabled) return;
    var self = this;

    // Store column information for responsive behavior
    this.responsiveColumns = [];

    // Get all headers
    var headers = Array.from(this.table.querySelectorAll('thead th'));

    // Create colgroup if it doesn't exist
    var colgroup = this.table.querySelector('colgroup');
    if (!colgroup) {
      colgroup = document.createElement('colgroup');
      this.table.insertBefore(colgroup, this.table.firstChild);
    } else {
      // Clear existing cols
      colgroup.innerHTML = '';
    }

    // Create col elements and store column information
    headers.forEach(function (header, index) {
      // Create col element
      var col = document.createElement('col');
      colgroup.appendChild(col);

      // Get priority from data attribute or options
      var priority = header.getAttribute('data-priority') || self.options.responsive.columnPriorities && self.options.responsive.columnPriorities[index] || index + 1;

      // Store column information
      self.responsiveColumns.push({
        index: index,
        header: header,
        col: col,
        priority: parseInt(priority, 10),
        minWidth: null,
        // Will be measured
        visible: true,
        alwaysVisible: header.classList.contains('always-visible') || false,
        neverVisible: header.classList.contains('never-visible') || false,
        // Don't store sort-related classes in the column information
        sortClass: false
      });
    });

    // Measure natural column widths
    this.calculateColumnWidths(); // Changed from measureColumnWidths to calculateColumnWidths

    // Set up resize observer
    if (window.ResizeObserver) {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      this.resizeObserver = new ResizeObserver(function () {
        self.checkResponsiveDisplay();

        // Update expanded rows after responsive changes
        self.updateExpandedRowsAfterResize();

        // Call onResize hook
        self.callHook('onResize', self);
      });
      this.resizeObserver.observe(this.wrapper);
    } else {
      // Fallback for browsers without ResizeObserver
      window.addEventListener('resize', function () {
        self.checkResponsiveDisplay();

        // Update expanded rows after responsive changes
        self.updateExpandedRowsAfterResize();

        // Call onResize hook
        self.callHook('onResize', self);
      });
    }

    // Initial check
    this.checkResponsiveDisplay();
  }
  checkResponsiveDisplay() {
    var self = this;
    var tableWidth = this.wrapper.offsetWidth;
    this.log('checkResponsiveDisplay - Current table width:', tableWidth);
    var requiredWidth = 0;
    var availableWidth = tableWidth;

    // First pass: calculate required width for all columns
    this.responsiveColumns.forEach(function (column) {
      requiredWidth += column.minWidth;
    });
    this.log('Total required width for all columns:', requiredWidth);

    // If all columns fit, show them all
    if (requiredWidth <= tableWidth) {
      this.log('All columns fit, showing all');
      this.responsiveColumns.forEach(function (column) {
        self.showColumn(column.index);
      });

      // Update expand indicators after showing all columns
      this.updateExpandIndicators();
      return;
    }

    // Sort columns by priority (higher number = lower priority)
    var sortedColumns = this.responsiveColumns.slice().sort(function (a, b) {
      return b.priority - a.priority; // Descending order by priority
    });

    // Second pass: hide columns by priority until they fit
    this.log('Hiding columns by priority until they fit');
    sortedColumns.forEach(function (column) {
      // Skip columns that should always be visible
      if (column.alwaysVisible) {
        self.log('Column', column.index, 'is always visible, skipping');
        return;
      }

      // If we still need to hide columns
      if (requiredWidth > tableWidth) {
        // Hide this column
        self.log('Hiding column', column.index, 'to save', column.minWidth, 'px');
        self.hideColumn(column.index);

        // Reduce required width
        requiredWidth -= column.minWidth;
        self.log('Required width now:', requiredWidth);
      } else {
        // Show this column
        self.log('Showing column', column.index);
        self.showColumn(column.index);
      }
    });

    // Update colgroup widths
    this.updateColWidths();

    // Update expand indicators based on hidden columns
    this.updateExpandIndicators();
    this.log('Final hidden columns:', this.hiddenColumns);
  }
  updateColWidths() {
    var tableWidth = this.wrapper.offsetWidth;
    var visibleColumns = this.responsiveColumns.filter(function (col) {
      return col.visible;
    });

    // Calculate total width of visible columns
    var totalMinWidth = visibleColumns.reduce(function (sum, col) {
      return sum + col.minWidth;
    }, 0);

    // Set width for each visible column
    visibleColumns.forEach(function (column) {
      var percentage = column.minWidth / totalMinWidth * 100;
      column.col.style.width = percentage + '%';
    });
  }
  hideColumn(index) {
    var column = this.responsiveColumns.find(function (col) {
      return col.index === index;
    });
    if (!column || !column.visible) return;

    // Mark as hidden
    column.visible = false;

    // Hide header
    column.header.style.display = 'none';

    // Hide all cells in this column
    var cells = this.table.querySelectorAll('tbody tr td:nth-child(' + (index + 1) + ')');
    cells.forEach(function (cell) {
      cell.style.display = 'none';
    });

    // Add to hidden columns array if not already there
    if (this.hiddenColumns.indexOf(index) === -1) {
      this.hiddenColumns.push(index);
    }

    // Emit event
    this.emitEvent('columnHide', [index]);
  }
  showColumn(index) {
    var column = this.responsiveColumns.find(function (col) {
      return col.index === index;
    });
    if (!column || column.visible) return;

    // Mark as visible
    column.visible = true;

    // Show header
    column.header.style.display = '';

    // Show all cells in this column
    var cells = this.table.querySelectorAll('tbody tr td:nth-child(' + (index + 1) + ')');
    cells.forEach(function (cell) {
      cell.style.display = '';
    });

    // Remove from hidden columns array
    var hiddenIndex = this.hiddenColumns.indexOf(index);
    if (hiddenIndex !== -1) {
      this.hiddenColumns.splice(hiddenIndex, 1);
    }

    // Emit event
    this.emitEvent('columnShow', [index]);
  }
  exportData(format) {
    const data = this.getExportData();

    // Call onExport hook
    this.callHook('onExport', format, data);
    switch (format) {
      case 'excel':
        this.exportToExcel(data);
        break;
      case 'csv':
        this.exportToCSV(data);
        break;
      case 'copy':
        this.copyToClipboard(data);
        break;
      case 'pdf':
        this.exportToPDF(data);
        break;
      case 'json':
        this.exportToJSON(data);
        break;
      case 'xml':
        this.exportToXML(data);
        break;
      case 'html':
        this.exportToHTML(data);
        break;
    }
  }
  getExportData() {
    var headers = Array.from(this.table.querySelectorAll('thead th')).map(function (th) {
      return th.textContent.trim();
    });
    var rows = this.filteredRows.map(function (row) {
      return Array.from(row.element.cells).map(function (cell) {
        return cell.textContent.trim();
      });
    });
    return {
      headers: headers,
      rows: rows
    };
  }
  exportToExcel(data) {
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet([data.headers].concat(data.rows));

    // Add column widths
    ws['!cols'] = data.headers.map(function () {
      return {
        wch: 15
      }; // Set default column width
    });
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // Generate filename with timestamp
    var filename = 'export_' + new Date().toISOString().slice(0, 19).replace(/[-:]/g, '') + '.xlsx';

    // Trigger download
    XLSX.writeFile(wb, filename);

    // Show success notification with filename
    this.showNotification('Successfully exported to ' + filename, 'success');
  }
  exportToCSV(data) {
    let csvContent = '';

    // Add headers
    csvContent += data.headers.join(',') + '\n';

    // Add rows
    data.rows.forEach(function (row) {
      // Escape values that contain commas
      const escapedRow = row.map(function (value) {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      });
      csvContent += escapedRow.join(',') + '\n';
    });

    // Generate filename based on table ID or current date
    const filename = (this.table.id || 'table-export') + '-' + new Date().toISOString().slice(0, 10) + '.csv';

    // Create download link
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    if (navigator.msSaveBlob) {
      // IE 10+
      navigator.msSaveBlob(blob, filename);
    } else {
      var link = document.createElement('a');
      if (link.download !== undefined) {
        var url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success notification with filename
        this.showNotification('Successfully exported to ' + filename, 'success');
      }
    }
  }
  copyToClipboard(data) {
    let textContent = '';

    // Add headers
    textContent += data.headers.join('\t') + '\n';

    // Add rows
    data.rows.forEach(function (row) {
      textContent += row.join('\t') + '\n';
    });

    // Create temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = textContent;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    try {
      textarea.select();
      const success = document.execCommand('copy');
      if (success) {
        this.showNotification('Copied to clipboard!', 'success');
      } else {
        this.showNotification('Copy failed. Please try again.', 'error');
      }
    } catch (err) {
      this.showNotification('Copy failed: ' + err, 'error');
    } finally {
      document.body.removeChild(textarea);
    }
  }
  showNotification(message, type) {
    // Create a unique ID for the toast container if it doesn't exist
    var toastContainerId = 'st-toast-container';
    var toastContainer = document.getElementById(toastContainerId);
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
      toastContainer.id = toastContainerId;
      document.body.appendChild(toastContainer);
    }

    // Create a unique ID for this toast
    var toastId = 'st-toast-' + Date.now();

    // Determine the appropriate Bootstrap color and icon based on type
    var colorClass = 'bg-primary';
    var icon = '✓';
    switch (type) {
      case 'success':
        colorClass = 'bg-success text-white';
        icon = '✓';
        break;
      case 'info':
        colorClass = 'bg-info text-white';
        icon = 'ℹ';
        break;
      case 'warning':
        colorClass = 'bg-warning';
        icon = '⚠';
        break;
      case 'danger':
      case 'error':
        colorClass = 'bg-danger text-white';
        icon = '⚠';
        break;
    }

    // Create the toast element with simplified structure
    var toast = document.createElement('div');
    toast.className = 'toast ' + colorClass + ' align-items-center border-0 py-2 px-3';
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    // Create the inner structure
    var innerDiv = document.createElement('div');
    innerDiv.className = 'd-flex';

    // Create toast body
    var toastBody = document.createElement('div');
    toastBody.className = 'toast-body d-flex align-items-center justify-content-center';
    toastBody.innerHTML = icon + ' ' + message;

    // Create close button
    var closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn btn-system ms-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');

    // Check if sprite.svg is available
    if (document.querySelector('use[href*="sprite.svg#x"]')) {
      closeButton.innerHTML = '<svg class="sa-icon sa-icon-light"><use href="img/sprite.svg#x"></use></svg>';
    } else {
      // Fallback to a simple × if the SVG sprite is not available
      closeButton.innerHTML = '×';
    }

    // Assemble the toast
    innerDiv.appendChild(toastBody);
    innerDiv.appendChild(closeButton);
    toast.appendChild(innerDiv);

    // Add the toast to the container
    toastContainer.appendChild(toast);

    // Initialize and show the toast using Bootstrap's Toast API
    var bsToast = new bootstrap.Toast(toast, {
      animation: true,
      autohide: true,
      delay: 3000 // Shorter delay for these compact toasts
    });
    bsToast.show();

    // Remove the toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', function () {
      toast.remove();

      // Remove the container if it's empty
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    });
  }
  addSortColumnClass(columnIndex) {
    this.toggleSortColumnClass(columnIndex, true);
  }
  removeSortColumnClass(columnIndex) {
    this.toggleSortColumnClass(columnIndex, false);
  }
  toggleSortColumnClass(columnIndex, isAdding) {
    var method = isAdding ? 'add' : 'remove';
    var selector = 'tbody tr td:nth-child(' + (columnIndex + 1) + ')';

    // Handle all visible cells
    var allCells = this.table.querySelectorAll(selector);
    allCells.forEach(function (cell) {
      cell.classList[method]('st-sort-column');
    });

    // Handle hidden columns in expanded rows
    if (this.hiddenColumns.includes(columnIndex)) {
      var headerText = this.table.querySelector('thead th:nth-child(' + (columnIndex + 1) + ')');
      if (!headerText) return;
      var headerContent = headerText.textContent;
      var expandedContent = this.table.querySelectorAll('.st-hidden-column-item');
      expandedContent.forEach(function (item) {
        var label = item.querySelector('.st-hidden-column-label');
        if (label && label.textContent.startsWith(headerContent)) {
          item.classList[method]('st-sort-column');
        }
      });
    }
  }
  showNoResultsMessage(searchTerm) {
    this.removeNoResultsMessage(); // Remove any existing message first

    var noResults = document.createElement('div');
    noResults.className = 'st-no-results alert alert-info mt-3';
    noResults.innerHTML = 'No search results found for <b>"' + searchTerm + '"</b>';
    this.wrapper.appendChild(noResults);
  }
  removeNoResultsMessage() {
    var existingMessage = this.wrapper.querySelector('.st-no-results');
    if (existingMessage) {
      existingMessage.remove();
    }
  }
  destroy() {
    // Ensure plugins is an array before calling hooks
    if (!Array.isArray(this.plugins)) {
      this.plugins = [];
    }

    // Call beforeDestroy hook
    this.callHook('beforeDestroy');

    // Remove resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove event listeners
    if (this.table) {
      var headers = this.table.querySelectorAll('th');
      headers.forEach(function (header) {
        if (header._sortHandler) {
          header.removeEventListener('click', header._sortHandler);
          delete header._sortHandler;
        }
      });
    }

    // Clear all data references
    this.rows = [];
    this.filteredRows = [];
    this.originalRows = [];
    this.hiddenColumns = [];
    this.columnWidths = [];

    // Clear pagination state
    this.currentPage = 1;

    // Completely remove and recreate the table element
    if (this.table) {
      // Store reference to parent and table attributes
      var parent = this.table.parentNode;
      var tagName = this.table.tagName;
      var id = this.table.id;
      var className = this.options.classes.table;
      var attributes = {};

      // Store any custom attributes
      for (var i = 0; i < this.table.attributes.length; i++) {
        var attr = this.table.attributes[i];
        if (attr.name !== 'id' && attr.name !== 'class') {
          attributes[attr.name] = attr.value;
        }
      }

      // Remove the old table completely
      this.table.remove();

      // Create a brand new table element
      this.table = document.createElement(tagName);
      if (id) this.table.id = id;
      this.table.className = className;

      // Restore any custom attributes
      for (var name in attributes) {
        this.table.setAttribute(name, attributes[name]);
      }

      // Add the new table to the wrapper
      if (this.wrapper) {
        this.wrapper.appendChild(this.table);
      } else if (parent) {
        parent.appendChild(this.table);
      }
    }

    // Remove toolbar if it exists
    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
    }

    // Remove pagination if it exists
    if (this.paginationContainer) {
      this.paginationContainer.remove();
      this.paginationContainer = null;
    }

    // Remove no results message if it exists
    var existingMessage = this.wrapper.querySelector('.st-no-results');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Remove any child rows
    var childRows = this.wrapper.querySelectorAll('tr.child');
    childRows.forEach(function (row) {
      row.remove();
    });

    // Clear any search input
    var searchInput = this.wrapper.querySelector('.st-search');
    if (searchInput) searchInput.value = '';

    // Reset any other state
    this.sortColumn = null;
    this.sortDirection = null;

    // Force garbage collection of any references
    setTimeout(function () {
      if (window.gc) window.gc();
    }, 100);

    // Destroy plugins
    this.plugins.forEach(function (plugin) {
      if (typeof plugin.destroy === 'function') {
        plugin.destroy();
      }
    });

    // Clear plugins array
    this.plugins = [];

    // Call afterDestroy hook
    this.callHook('afterDestroy');
  }

  // Add plugin system methods
  initializePlugins() {
    this.plugins = [];
    if (Array.isArray(this.options.plugins)) {
      // Initialize each plugin
      this.options.plugins.forEach(function (plugin) {
        this.registerPlugin(plugin);
      }, this);
    }
  }
  registerPlugin(plugin) {
    if (typeof plugin !== 'object' || !plugin.name) {
      console.error('Invalid plugin format. Plugin must be an object with a name property.');
      return;
    }

    // Create plugin instance
    var pluginInstance = {
      name: plugin.name,
      instance: this
    };

    // Copy plugin methods
    for (var key in plugin) {
      if (key !== 'name' && typeof plugin[key] === 'function') {
        pluginInstance[key] = plugin[key].bind(pluginInstance);
      }
    }

    // Call plugin init method if it exists
    if (typeof pluginInstance.init === 'function') {
      pluginInstance.init();
    }

    // Add to plugins array
    this.plugins.push(pluginInstance);
    console.log('Plugin registered:', plugin.name);
  }
  getPlugin(name) {
    return this.plugins.find(function (plugin) {
      return plugin.name === name;
    });
  }

  // Add hook system methods
  callHook(hookName, ...args) {
    // Call hook from options if it exists
    if (this.options.hooks && typeof this.options.hooks[hookName] === 'function') {
      // Add this instance as the last argument if not already included
      if (args[args.length - 1] !== this) {
        args.push(this);
      }

      // Call the hook
      this.options.hooks[hookName].apply(this, args);
    }

    // Ensure plugins is an array before iterating
    if (!Array.isArray(this.plugins)) {
      this.plugins = [];
    }

    // Call hook method on all plugins if they have it
    this.plugins.forEach(function (plugin) {
      if (typeof plugin[hookName] === 'function') {
        plugin[hookName].apply(plugin, args);
      }
    });

    // Emit event for external listeners
    this.emitEvent(hookName, args);
  }

  // Event emitter system
  emitEvent(eventName, args) {
    // Create custom event
    var event = new CustomEvent('st:' + eventName, {
      detail: {
        instance: this,
        args: args
      },
      bubbles: true,
      cancelable: true
    });

    // Dispatch event on the table element
    this.table.dispatchEvent(event);
  }
  setupResponsiveRows() {
    if (!this.options.responsive.enabled) return;
    const self = this;
    const tbody = this.table.querySelector('tbody');

    // Remove any existing click handlers to prevent duplicates
    if (tbody._expandClickHandler) {
      tbody.removeEventListener('click', tbody._expandClickHandler);
    }

    // Create and store the handler function
    tbody._expandClickHandler = e => {
      // Check if the click was on the first cell or its child elements
      const cell = e.target.closest('td:first-child');

      // Skip if we clicked inside a child row or if there are no hidden columns
      if (!cell || self.hiddenColumns.length === 0 || e.target.closest('.st-child-row')) {
        return;
      }
      const row = cell.closest('tr');
      if (!row) return;

      // Get the original row data
      const rowElement = row;
      let rowData = self.filteredRows.find(r => r.element === rowElement || r.element.isEqualNode(rowElement));
      if (!rowData) {
        // If we can't find the exact row, try to find by index
        const rowIndex = Array.from(tbody.querySelectorAll('tr:not(.st-child-row)')).indexOf(row);
        const pageOffset = (self.currentPage - 1) * self.options.perPage;
        rowData = self.filteredRows[pageOffset + rowIndex];
      }
      if (!rowData) {
        console.warn('Could not find row data');
        return;
      }

      // Update the row element reference in case it was cloned
      rowData.element = row;

      // Toggle expanded state
      rowData.expanded = !rowData.expanded;

      // Update the row display
      self.updateExpandedRow(rowData);
    };

    // Add the click handler
    tbody.addEventListener('click', tbody._expandClickHandler);

    // Add expand indicator to first cells only if there are hidden columns
    if (this.hiddenColumns.length > 0) {
      const rows = tbody.querySelectorAll('tr:not(.st-child-row)');
      rows.forEach((row, index) => {
        if (row.cells.length > 0) {
          const firstCell = row.cells[0];
          firstCell.classList.add('st-expand');

          // Check if this row should be expanded
          const pageOffset = (self.currentPage - 1) * self.options.perPage;
          const rowData = self.filteredRows[pageOffset + index];
          if (rowData && rowData.expanded) {
            firstCell.classList.add('st-expand-active');
            self.updateExpandedRow(rowData);
          }
        }
      });
    } else {
      // Remove expand classes if no hidden columns
      const rows = tbody.querySelectorAll('tr:not(.st-child-row)');
      rows.forEach(row => {
        if (row.cells.length > 0) {
          const firstCell = row.cells[0];
          firstCell.classList.remove('st-expand', 'st-expand-active');
        }
      });

      // Reset expanded state for all rows
      this.filteredRows.forEach(rowData => {
        rowData.expanded = false;
      });

      // Remove any child rows
      const childRows = tbody.querySelectorAll('.st-child-row');
      childRows.forEach(row => row.remove());
    }
  }
  updateExpandedRow(rowData) {
    if (!rowData || !rowData.element) {
      console.warn('Invalid row data');
      return;
    }
    var row = rowData.element;
    if (!row.parentNode) {
      console.warn('Row is not in the DOM');
      return;
    }

    // Don't do anything if there are no hidden columns
    if (this.hiddenColumns.length === 0) {
      rowData.expanded = false;
      return;
    }

    // Update row expanded class
    if (rowData.expanded) {
      row.classList.add('expanded');
    } else {
      row.classList.remove('expanded');
    }

    // Update first cell with visual indicator
    var firstCell = row.cells[0];
    if (firstCell) {
      // Always ensure st-expand class is present for the click handler
      firstCell.classList.add('st-expand');
      if (rowData.expanded) {
        firstCell.classList.add('st-expand-active');
      } else {
        firstCell.classList.remove('st-expand-active');
      }
    }

    // Remove existing child row if any
    var existingChild = row.nextElementSibling;
    if (existingChild && existingChild.classList.contains('st-child-row')) {
      existingChild.remove();
    }
    if (rowData.expanded) {
      // Create new child row
      var childRow = document.createElement('tr');
      childRow.className = 'st-child-row';

      // Create child row content
      var cell = document.createElement('td');
      cell.colSpan = row.cells.length;
      cell.className = 'st-child-content';
      var content = document.createElement('div');
      content.className = 'st-hidden-columns gap-2 gap-md-2';

      // Add hidden column data
      this.hiddenColumns.forEach(function (columnIndex) {
        var header = this.table.querySelector('thead th:nth-child(' + (columnIndex + 1) + ')');
        if (!header) return;
        var headerText = header.textContent;
        var cellValue = row.cells[columnIndex] ? row.cells[columnIndex].textContent : '';
        var item = document.createElement('div');
        item.className = 'st-hidden-column-item flex-column flex-md-column flex-lg-row';
        var label = document.createElement('span');
        label.className = 'st-hidden-column-label';
        label.textContent = headerText + ': ';
        var value = document.createElement('span');
        value.className = 'st-hidden-column-value';
        value.textContent = cellValue;
        item.appendChild(label);
        item.appendChild(value);
        content.appendChild(item);
      }, this);
      cell.appendChild(content);
      childRow.appendChild(cell);

      // Insert the child row after the parent row
      row.parentNode.insertBefore(childRow, row.nextSibling);
    }
  }
  updateExpandedRowsAfterResize() {
    var self = this;
    var tbody = this.table.querySelector('tbody');

    // Find all expanded rows
    var expandedRows = Array.from(tbody.querySelectorAll('tr.expanded'));
    expandedRows.forEach(function (row) {
      // Find the row data
      var rowData = self.filteredRows.find(function (r) {
        return r.element === row || r.element.isEqualNode(row);
      });
      if (rowData) {
        // Update the expanded row content
        self.updateExpandedRow(rowData);
      }
    });

    // Also update any rows that have expanded state in data but not in DOM
    this.filteredRows.forEach(function (rowData) {
      if (rowData.expanded && !rowData.element.classList.contains('expanded')) {
        rowData.element.classList.add('expanded');
        self.updateExpandedRow(rowData);
      }
    });
  }

  // Add this new method to update expand indicators
  updateExpandIndicators() {
    if (!this.options.responsive.enabled) return;
    var tbody = this.table.querySelector('tbody');
    if (!tbody) return;

    // Check if we have any hidden columns
    if (this.hiddenColumns.length > 0) {
      // Add expand indicators to first cells
      var rows = tbody.querySelectorAll('tr:not(.st-child-row)');
      rows.forEach(function (row) {
        if (row.cells.length > 0) {
          var firstCell = row.cells[0];
          firstCell.classList.add('st-expand');

          // Make sure cursor style is applied
          firstCell.style.cursor = 'pointer';
        }
      });
    } else {
      // Remove expand indicators from first cells
      var rows = tbody.querySelectorAll('tr:not(.st-child-row)');
      rows.forEach(function (row) {
        if (row.cells.length > 0) {
          var firstCell = row.cells[0];
          firstCell.classList.remove('st-expand', 'st-expand-active');

          // Reset cursor style
          firstCell.style.cursor = '';
        }
      });

      // Remove any child rows
      var childRows = tbody.querySelectorAll('.st-child-row');
      childRows.forEach(function (row) {
        row.remove();
      });

      // Reset expanded state for all rows
      this.filteredRows.forEach(function (rowData) {
        rowData.expanded = false;
      });
    }
  }

  // Add debug logging method
  log(...args) {
    if (this.options.debug) {
      console.log('[SmartTables]', ...args);
    }
  }
  exportToJSON(data) {
    // Convert the data to a JSON string
    const jsonData = JSON.stringify(data.rows, null, 2);

    // Create a Blob with the JSON data
    const blob = new Blob([jsonData], {
      type: 'application/json'
    });

    // Create a download link and trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showNotification('Data exported to JSON successfully', 'success');
  }
  exportToPDF(data) {
    try {
      // Create a hidden div to hold the table
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      // Create a table 
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';

      // Create header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      data.headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.style.backgroundColor = '#f2f2f2';
        th.style.border = '1px solid #ddd';
        th.style.padding = '8px';
        th.style.fontWeight = 'bold';
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Create body
      const tbody = document.createElement('tbody');
      data.rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
          const td = document.createElement('td');
          td.textContent = cell;
          td.style.border = '1px solid #ddd';
          td.style.padding = '8px';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      container.appendChild(table);

      // Use html2pdf library if available, or fallback to print method
      if (typeof html2pdf !== 'undefined') {
        html2pdf().from(table).save('table-export.pdf');
        this.showNotification('Data exported to PDF successfully', 'success');
      } else {
        // If html2pdf isn't available, try jsPDF if available
        if (typeof jspdf !== 'undefined' && typeof jspdf.jsPDF === 'function') {
          const doc = new jspdf.jsPDF();

          // Simple conversion with limited styling
          doc.autoTable({
            html: table
          });
          doc.save('table-export.pdf');
          this.showNotification('Data exported to PDF successfully', 'success');
        } else {
          // Fallback to print method if no PDF library is available
          const printWindow = window.open('', '_blank');
          printWindow.document.write('<html><head><title>Export to PDF</title>');
          printWindow.document.write('<style>table { width: 100%; border-collapse: collapse; } ' + 'th, td { border: 1px solid #ddd; padding: 8px; } ' + 'th { background-color: #f2f2f2; font-weight: bold; }</style>');
          printWindow.document.write('</head><body>');
          printWindow.document.write('<p>Please use your browser\'s print function to save as PDF.</p>');
          printWindow.document.write(table.outerHTML);
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
          this.showNotification('Please use print dialog to save as PDF', 'info');
        }
      }

      // Clean up
      document.body.removeChild(container);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      this.showNotification('Error exporting to PDF. Check console for details.', 'error');
    }
  }
  exportToXML(data) {
    try {
      // Create XML document
      let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xmlContent += '<table>\n';

      // Add headers
      xmlContent += '  <headers>\n';
      data.headers.forEach(header => {
        // Sanitize header to valid XML
        const safeHeader = header.replace(/[<>&'"]/g, char => {
          switch (char) {
            case '<':
              return '&lt;';
            case '>':
              return '&gt;';
            case '&':
              return '&amp;';
            case '\'':
              return '&apos;';
            case '"':
              return '&quot;';
          }
        });
        xmlContent += `    <header>${safeHeader}</header>\n`;
      });
      xmlContent += '  </headers>\n';

      // Add rows
      xmlContent += '  <rows>\n';
      data.rows.forEach(row => {
        xmlContent += '    <row>\n';
        row.forEach((cell, index) => {
          // Use header as element name (sanitized)
          let elementName = data.headers[index] || `column${index + 1}`;
          // Make sure element name is valid XML tag (alphanumeric and underscore only)
          elementName = elementName.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[^a-zA-Z_]/, '_');

          // Sanitize cell value
          const safeValue = String(cell).replace(/[<>&'"]/g, char => {
            switch (char) {
              case '<':
                return '&lt;';
              case '>':
                return '&gt;';
              case '&':
                return '&amp;';
              case '\'':
                return '&apos;';
              case '"':
                return '&quot;';
            }
          });
          xmlContent += `      <${elementName}>${safeValue}</${elementName}>\n`;
        });
        xmlContent += '    </row>\n';
      });
      xmlContent += '  </rows>\n';
      xmlContent += '</table>';

      // Create Blob and download
      const blob = new Blob([xmlContent], {
        type: 'application/xml'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'table-export.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      this.showNotification('Data exported to XML successfully', 'success');
    } catch (error) {
      console.error('Error exporting to XML:', error);
      this.showNotification('Error exporting to XML. Check console for details.', 'error');
    }
  }
  exportToHTML(data) {
    try {
      // Start HTML document with styling
      let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Table Export</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .export-info {
            color: #666;
            font-size: 12px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <h1>Exported Table</h1>
    <p class="export-info">Exported on ${new Date().toLocaleString()}</p>
    <table>
        <thead>
            <tr>
`;

      // Add headers
      data.headers.forEach(header => {
        htmlContent += `                <th>${this.escapeHTML(header)}</th>\n`;
      });
      htmlContent += `            </tr>
        </thead>
        <tbody>
`;

      // Add data rows
      data.rows.forEach(row => {
        htmlContent += '            <tr>\n';
        row.forEach(cell => {
          htmlContent += `                <td>${this.escapeHTML(cell)}</td>\n`;
        });
        htmlContent += '            </tr>\n';
      });

      // Close HTML document
      htmlContent += `        </tbody>
    </table>
</body>
</html>`;

      // Create Blob and download
      const blob = new Blob([htmlContent], {
        type: 'text/html'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'table-export.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      this.showNotification('Data exported to HTML successfully', 'success');
    } catch (error) {
      console.error('Error exporting to HTML:', error);
      this.showNotification('Error exporting to HTML. Check console for details.', 'error');
    }
  }
  escapeHTML(unsafe) {
    if (unsafe === null || unsafe === undefined) {
      return '';
    }
    return String(unsafe).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
}