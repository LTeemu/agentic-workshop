export function auditProtocol(resources, pageHeaders) {
  let http2Count = 0;
  let http1Count = 0;
  let unknownCount = 0;

  for (const res of resources) {
    const proto = (res.protocol || '').toLowerCase();
    if (proto.includes('h2') || proto.includes('http/2') || proto === 'http/2') {
      http2Count++;
    } else if (
      proto.includes('h1') ||
      proto.includes('http/1') ||
      proto === 'http/1.1' ||
      proto === 'http/1'
    ) {
      http1Count++;
    } else {
      const ce = (res.headers?.['content-encoding'] || '').toLowerCase();
      if (ce) {
        http2Count++;
      } else {
        unknownCount++;
      }
    }
  }

  const mainProto =
    pageHeaders?.headers?.['x-protocol'] || (resources.length > 0 ? 'mixed' : 'unknown');

  const total = http2Count + http1Count + unknownCount;
  const http2Percent = total === 0 ? 0 : Math.round((http2Count / total) * 100);

  return {
    mainPageProtocol: mainProto,
    http2Resources: http2Count,
    http1Resources: http1Count,
    unknownResources: unknownCount,
    totalChecked: resources.length,
    http2Percent,
    score: http2Percent,
  };
}
