export function auditCompression(pageHeaders, resources) {
  const url = pageHeaders.url ?? '';
  let mainCompressed = false;
  let mainEncoding = 'none';

  if (pageHeaders.headers) {
    const ce = pageHeaders.headers['content-encoding'] || '';
    if (ce.includes('gzip') || ce.includes('br') || ce.includes('deflate')) {
      mainCompressed = true;
      mainEncoding = ce;
    }
  }

  let resourcesWithoutCompression = 0;
  let totalBytes = 0;
  let potentialSavingsBytes = 0;
  const details = [];

  for (const res of resources) {
    const ce = res.headers?.['content-encoding'] || '';
    const cl = parseInt(res.headers?.['content-length'] || '0', 10);

    if (cl > 0) {
      totalBytes += cl;
      if (!ce.includes('gzip') && !ce.includes('br') && !ce.includes('deflate')) {
        resourcesWithoutCompression++;
        const estimated = Math.round(cl * 0.7);
        potentialSavingsBytes += estimated;
        details.push({
          url: res.url,
          size: cl,
          estimatedSaving: estimated,
          encoding: ce || 'none',
        });
      }
    }
  }

  return {
    mainPageCompressed: mainCompressed,
    mainPageEncoding: mainEncoding,
    resourcesWithoutCompression,
    totalBytes,
    potentialSavingsBytes,
    details,
    score:
      resourcesWithoutCompression === 0
        ? 100
        : Math.max(
            0,
            100 - Math.round((resourcesWithoutCompression / Math.max(resources.length, 1)) * 100),
          ),
  };
}
