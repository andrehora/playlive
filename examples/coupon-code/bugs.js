/* Bugs this site can be broken with, one at a time.

   Each one is a patch on the page's own source: `find` must appear in
   index.html exactly once, and `replace` is the broken version. A bug whose
   `find` no longer matches is reported as not applying rather than passing
   quietly, so editing the page cannot leave a bug scoring for free.

   `title` says what breaks, in the words someone would use to report it.  */
export default [
  {
    id: 'rate',
    title: 'The discount is 15% instead of 10%',
    find: 'disc=SUB*0.1;',
    replace: 'disc=SUB*0.15;'
  },
  {
    id: 'freeship',
    title: 'FREESHIP leaves the shipping charge on',
    find: "else if(c==='FREESHIP'){ship=0;",
    replace: "else if(c==='FREESHIP'){ship=5;"
  },
  {
    id: 'total',
    title: 'The total leaves shipping out',
    find: '(SUB-disc+ship).toFixed(2)',
    replace: '(SUB-disc).toFixed(2)'
  },
  {
    id: 'case',
    title: 'Codes are case sensitive',
    find: '.value.trim().toUpperCase()',
    replace: '.value.trim()'
  },
  {
    id: 'expired',
    title: 'An expired code says nothing at all',
    find: "$('err').textContent='This code expired on August 31.';",
    replace: "$('err').textContent='';"
  },
  {
    id: 'unknown',
    title: 'The unknown-code message drops the code',
    find: '"We don\'t recognize the code "+c+\'.\'',
    replace: '"We don\'t recognize the code."'
  },
  {
    id: 'stale',
    title: 'The old error stays on screen after a good code',
    find: "$('ok').hidden=true;$('err').textContent='';",
    replace: "$('ok').hidden=true;"
  },
  {
    id: 'banner',
    title: 'FREESHIP applies but says nothing',
    find: "ship=0;$('ok').hidden=false;$('ok').textContent='FREESHIP applied: free shipping.';",
    replace: 'ship=0;'
  }
];
