def formatmonthname(self, theyear, themonth, withyear=True):
    """
    Return a month name as a table row.
    """
    _validate_month(themonth)
    if withyear:
        s = '%s %s' % (month_name[themonth], theyear)
    else:
        s = '%s' % month_name[themonth]
    return '<tr><th colspan="7" class="%s">%s</th></tr>' % (
        self.cssclass_month_head, s)
