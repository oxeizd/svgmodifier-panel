type DecimalCount = number;

export enum Interval {
  Year = 'year',
  Month = 'month',
  Week = 'week',
  Day = 'day',
  Hour = 'hour',
  Minute = 'minute',
  Second = 'second',
  Millisecond = 'millisecond',
}

function roundToFixed(value: number, decimals: DecimalCount = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function formatScaled(value: number, decimals: DecimalCount = 2, suffix: string): string {
  return `${roundToFixed(value, decimals)}${suffix}`;
}

export function formatValues(value: number, unit?: string, decimals?: DecimalCount): string {
  if (value === null) {
    return '';
  }

  let formattedValue: number = value;

  if (unit) {
    switch (unit.toLowerCase()) {
      case 'seconds':
        return toSeconds(value, decimals);
      case 'milliseconds':
        return toMilliSeconds(value, decimals);
      case 'bytes':
        return toBytes(value, decimals);
      case 'percent':
        return toPercent(value, decimals);
      case 'percentUnit':
        return toPercentUnit(value, decimals);
    }
  }

  const decimalPlaces = 2;
  const roundedValue = roundToFixed(formattedValue, decimalPlaces);
  return `${roundedValue}`;
}

export function toPercent(value: number, decimals?: DecimalCount): string {
  if (value === null) {
    return '';
  }

  return formatScaled(value, decimals, ' %');
}

export function toPercentUnit(value: number, decimals?: DecimalCount): string {
  if (value === null) {
    return '';
  }

  return formatScaled(value * 100, decimals, ' %');
}

export function toBytes(size: number, decimals?: DecimalCount): string {
  if (size === null) {
    return '';
  }

  if (Math.abs(size) < 1024) {
    return formatScaled(size, decimals, ' B');
  } else if (Math.abs(size) < 1048576) {
    return formatScaled(size / 1024, decimals, ' KB');
  } else if (Math.abs(size) < 1073741824) {
    return formatScaled(size / 1048576, decimals, ' MB');
  } else {
    return formatScaled(size / 1073741824, decimals, ' GB');
  }
}

export function toMilliSeconds(size: number, decimals?: DecimalCount): string {
  if (size === null) {
    return '';
  }

  if (Math.abs(size) < 1000) {
    return formatScaled(size, decimals, ' ms');
  } else if (Math.abs(size) < 60000) {
    return formatScaled(size / 1000, decimals, ' s');
  } else if (Math.abs(size) < 3600000) {
    return formatScaled(size / 60000, decimals, ' min');
  } else if (Math.abs(size) < 86400000) {
    return formatScaled(size / 3600000, decimals, ' hour');
  } else if (Math.abs(size) < 31536000000) {
    return formatScaled(size / 86400000, decimals, ' day');
  }

  return formatScaled(size / 31536000000, decimals, ' year');
}

export function toSeconds(size: number, decimals?: DecimalCount): string {
  if (size === null) {
    return '';
  }

  if (size === 0) {
    return '0 s';
  }

  if (Math.abs(size) < 0.000001) {
    return formatScaled(size * 1e9, decimals, ' ns');
  }

  if (Math.abs(size) < 0.001) {
    return formatScaled(size * 1e6, decimals, ' µs');
  }

  if (Math.abs(size) < 1) {
    return formatScaled(size * 1e3, decimals, ' ms');
  }

  if (Math.abs(size) < 60) {
    return formatScaled(size, decimals, ' s');
  } else if (Math.abs(size) < 3600) {
    return formatScaled(size / 60, decimals, ' min');
  } else if (Math.abs(size) < 86400) {
    return formatScaled(size / 3600, decimals, ' hour');
  } else if (Math.abs(size) < 31536000) {
    return formatScaled(size / 86400, decimals, ' day');
  }

  return formatScaled(size / 31536000, decimals, ' year');
}
