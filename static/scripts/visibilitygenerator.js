// Show/hide display type section based on visibility mode
document.querySelectorAll('input[name="visibilityMode"]').forEach(radio => {
  radio.addEventListener('change', function () {
    const displayTypeSection = document.getElementById('displayTypeSection');
    displayTypeSection.style.display = this.value === 'visible' ? 'block' : 'none';
  });
});

// Handle "All Breakpoints" checkbox logic
const allCheckbox = document.getElementById('all');
const breakpointCheckboxes = document.querySelectorAll('.breakpoint-checkbox');
allCheckbox.addEventListener('change', function () {
  const isChecked = this.checked;
  breakpointCheckboxes.forEach(cb => {
    cb.checked = isChecked;
  });
});
breakpointCheckboxes.forEach(cb => {
  cb.addEventListener('change', function () {
    const allChecked = Array.from(breakpointCheckboxes).every(cb => cb.checked);
    allCheckbox.checked = allChecked;
  });
});
document.getElementById('generateBtn').addEventListener('click', function () {
  // Get visibility mode
  const visibilityMode = document.querySelector('input[name="visibilityMode"]:checked').value;

  // Get selected breakpoints
  const selectedBreakpoints = Array.from(document.querySelectorAll('.breakpoint-checkbox')).filter(cb => cb.checked).map(cb => cb.value);

  // Get selected display type (for visible mode, default to 'block' for hidden mode visibility)
  const displayType = visibilityMode === 'visible' ? document.querySelector('input[name="displayType"]:checked').value : 'block';

  // Validate selections
  if (selectedBreakpoints.length === 0) {
    document.getElementById('classOutput').textContent = 'Please select at least one breakpoint.';
    document.getElementById('cssOutput').textContent = '/* No CSS generated */';
    document.getElementById('testDiv').className = 'd-none'; // Hide test div
    return;
  }

  // Define all breakpoints
  const allBreakpoints = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  const mediaQueries = {
    'sm': '@media (min-width: 576px)',
    'md': '@media (min-width: 768px)',
    'lg': '@media (min-width: 992px)',
    'xl': '@media (min-width: 1200px)',
    'xxl': '@media (min-width: 1400px)'
  };

  // Determine unselected breakpoints
  const unselectedBreakpoints = allBreakpoints.filter(bp => !selectedBreakpoints.includes(bp));

  // Generate BS5 classes based on visibility mode
  const classes = [];
  const cssLines = [];
  const selector = '.my-element'; // Example selector

  if (visibilityMode === 'hidden') {
    // Default: visible (using displayType)
    classes.push(`d-${displayType}`);
    cssLines.push(`${selector} { display: ${displayType} !important; }`);

    // Hide on selected breakpoints
    selectedBreakpoints.forEach(bp => {
      if (bp === 'xs') {
        classes[0] = 'd-none'; // Override default for xs
        classes.push('d-sm-block');
        cssLines[0] = `${selector} { display: none !important; }`;
        cssLines.push(`${mediaQueries['sm']} {`);
        cssLines.push(`  ${selector} { display: ${displayType} !important; }`);
        cssLines.push('}');
      } else {
        classes.push(`d-${bp}-none`);
        cssLines.push(`${mediaQueries[bp]} {`);
        cssLines.push(`  ${selector} { display: none !important; }`);
        cssLines.push('}');
      }
    });

    // Ensure visibility on unselected breakpoints after hiding
    unselectedBreakpoints.forEach(bp => {
      if (bp !== 'xs' && selectedBreakpoints.includes(allBreakpoints[allBreakpoints.indexOf(bp) - 1])) {
        classes.push(`d-${bp}-${displayType}`);
        cssLines.push(`${mediaQueries[bp]} {`);
        cssLines.push(`  ${selector} { display: ${displayType} !important; }`);
        cssLines.push('}');
      }
    });
  } else {
    // visibilityMode === 'visible'
    // Default: hidden
    classes.push('d-none');
    cssLines.push(`${selector} { display: none !important; }`);

    // Show on selected breakpoints
    selectedBreakpoints.forEach(bp => {
      const prefix = bp === 'xs' ? 'd' : `d-${bp}`;
      classes.push(`${prefix}-${displayType}`);
      if (bp !== 'xs') {
        cssLines.push(`${mediaQueries[bp]} {`);
        cssLines.push(`  ${selector} { display: ${displayType} !important; }`);
        cssLines.push('}');
      } else {
        cssLines[0] = `${selector} { display: ${displayType} !important; }`;
      }
    });

    // Ensure hidden on unselected breakpoints after showing
    unselectedBreakpoints.forEach(bp => {
      if (bp !== 'xs' && selectedBreakpoints.includes(allBreakpoints[allBreakpoints.indexOf(bp) - 1])) {
        classes.push(`d-${bp}-none`);
        cssLines.push(`${mediaQueries[bp]} {`);
        cssLines.push(`  ${selector} { display: none !important; }`);
        cssLines.push('}');
      }
    });
  }

  // Apply classes to the test div
  const testDiv = document.getElementById('testDiv');
  testDiv.className = 'd-none'; // Reset classes
  testDiv.classList.add(...classes);

  // Output the classes
  document.getElementById('classOutput').textContent = classes.join(' ');

  // Output the CSS equivalent
  document.getElementById('cssOutput').textContent = cssLines.join('\n');
});